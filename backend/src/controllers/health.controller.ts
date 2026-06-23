import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { plaidClient } from '../lib/plaid';
import { AuthRequest } from '../middleware/auth';
import { addDays } from 'date-fns';
import { nextFuturePayDate } from '../lib/income';

// The PRIMARY account's live balance anchors safe-to-spend to real cash rather
// than a pure income projection. Returns null if no PRIMARY account is set
// (or its balance can't be fetched), so callers can fall back to the estimate.
async function getPrimaryBalance(userId: string): Promise<number | null> {
  const primary = await prisma.plaidAccount.findFirst({
    where: { role: 'PRIMARY', plaidItem: { userId } },
    include: { plaidItem: true },
  });
  if (!primary) return null;

  try {
    const { data } = await plaidClient.accountsGet({ access_token: primary.plaidItem.accessToken });
    const account = data.accounts.find((a) => a.account_id === primary.accountId);
    return account?.balances.available ?? account?.balances.current ?? null;
  } catch {
    return null;
  }
}

/**
 * Financial Health Score (0–100):
 *   40pts — bill pay rate (% paid on time)
 *   30pts — buffer days (days of expenses covered, capped at 7)
 *   30pts — debt-to-income ratio (lower is better, capped at 0)
 */
export async function computeHealthScore(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  const [bills, income, transactions, primaryBalance] = await Promise.all([
    prisma.bill.findMany({ where: { userId } }),
    prisma.incomeSource.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: addDays(new Date(), -30) } },
    }),
    getPrimaryBalance(userId),
  ]);
  const cashSource: 'balance' | 'estimate' = primaryBalance !== null ? 'balance' : 'estimate';

  // Bill pay rate — only bills already past due count as missed.
  // Future unpaid bills are not yet overdue, so they don't penalise the score.
  const now = new Date();
  const pastDueBills = bills.filter((b) => b.dueDate < now);
  const paidPastDue = pastDueBills.filter((b) => b.isPaid).length;
  const billPayRate = pastDueBills.length > 0 ? paidPastDue / pastDueBills.length : 1;

  // Monthly income
  const monthlyIncome = income.reduce((sum, s) => {
    const multipliers = { WEEKLY: 4.33, BIWEEKLY: 2.17, SEMIMONTHLY: 2, MONTHLY: 1 };
    return sum + s.amount * multipliers[s.frequency];
  }, 0);

  // Transfers between the user's own accounts aren't real income or spending,
  // so they're excluded from both totals below.
  const TRANSFER_CATEGORIES = ['TRANSFER_IN', 'TRANSFER_OUT'];

  // Monthly expenses (clamped at 0 — a month with more refunds than spending
  // shouldn't produce a negative expense total).
  const monthlyExpenses = Math.max(
    0,
    transactions
      .filter((t) => t.type === 'EXPENSE' && !TRANSFER_CATEGORIES.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Monthly debt payments
  const debtBills = bills.filter((b) => b.category === 'DEBT');
  const monthlyDebt = debtBills.reduce((sum, b) => sum + b.amount, 0);

  // Debt-to-income ratio
  const debtToIncome = monthlyIncome > 0 ? monthlyDebt / monthlyIncome : 1;

  // Buffer days: only meaningful when there is real expense transaction history.
  // Falling back to income when expenses are zero causes the score to divide income
  // by itself, always hitting the cap regardless of actual financial health.
  const hasExpenseHistory = monthlyExpenses > 0;
  const dailyExpense = hasExpenseHistory ? monthlyExpenses / 30 : 1;
  const lastIncome = transactions
    .filter((t) => t.type === 'INCOME' && !TRANSFER_CATEGORIES.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const cashEstimate = lastIncome > 0 ? lastIncome : monthlyIncome;
  const bufferDays = hasExpenseHistory
    ? Math.min(cashEstimate / dailyExpense, 14)
    : 0;

  // Score requires enough data to be meaningful.
  // Without bills AND without transaction history we cannot fairly score any dimension,
  // so we skip persisting a snapshot and return null to the client.
  const hasEnoughData = bills.length > 0 || transactions.length > 0;

  if (!hasEnoughData) {
    const nextPay = income.length > 0
      ? Math.min(...income.map((s) => nextFuturePayDate(s.nextPayDate, s.frequency).getTime()))
      : null;
    const daysUntilPay = nextPay !== null
      ? (nextPay - Date.now()) / (1000 * 60 * 60 * 24)
      : null;
    const incomeBeforeNextPay = nextPay !== null
      ? income.reduce((sum, s) => {
          const futureDate = nextFuturePayDate(s.nextPayDate, s.frequency);
          return futureDate.getTime() <= nextPay ? sum + s.amount : sum;
        }, 0)
      : 0;

    const safeToSpend = primaryBalance !== null
      ? Math.max(0, primaryBalance + incomeBeforeNextPay)
      : incomeBeforeNextPay;

    return res.json({
      score: null,
      bufferDays: 0,
      billPayRate: 1,
      debtToIncome: 0,
      safeToSpend,
      daysUntilNextPay: daysUntilPay !== null ? Math.round(daysUntilPay) : null,
      monthlyIncome,
      cashSource,
    });
  }

  // Bill score:   0 pts if no bills yet (nothing to evaluate)
  // Buffer score: 0 pts if no expense history (no real spending data to base it on)
  // Debt score:   0 pts if no bills at all (no debt picture to evaluate)
  const billScore   = bills.length > 0        ? billPayRate * 40                    : 0;
  const bufferScore = hasExpenseHistory        ? (Math.min(bufferDays, 7) / 7) * 30 : 0;
  const debtScore   = bills.length > 0        ? Math.max(0, 1 - debtToIncome) * 30 : 0;
  const score = Math.round(billScore + bufferScore + debtScore);

  // Persist snapshot
  const snapshot = await prisma.healthSnapshot.create({
    data: { userId, score, bufferDays, billPayRate, debtToIncome },
  });

  // Safe-to-spend: income due before next paycheck minus bills due before then
  // Advance any past nextPayDate forward by its frequency so daysUntilNextPay is always >= 0.
  const nextPay = income.length > 0
    ? Math.min(...income.map((s) => nextFuturePayDate(s.nextPayDate, s.frequency).getTime()))
    : null;
  const daysUntilPay = nextPay !== null
    ? (nextPay - Date.now()) / (1000 * 60 * 60 * 24)
    : null;

  // Income expected between now and next payday.
  const incomeBeforeNextPay = nextPay !== null
    ? income.reduce((sum, s) => {
        const futureDate = nextFuturePayDate(s.nextPayDate, s.frequency);
        return futureDate.getTime() <= nextPay ? sum + s.amount : sum;
      }, 0)
    : 0;

  // Unpaid bills due on or before next payday.
  const upcomingBillTotal = nextPay !== null
    ? bills
        .filter((b) => !b.isPaid && b.dueDate.getTime() <= nextPay)
        .reduce((sum, b) => sum + b.amount, 0)
    : 0;

  // Safe-to-spend: cash on hand (when a PRIMARY account balance is available)
  // plus money arriving before next payday, minus bills due before then.
  // Without a PRIMARY balance, this falls back to a pure income/bills projection.
  const safeToSpend = primaryBalance !== null
    ? Math.max(0, primaryBalance + incomeBeforeNextPay - upcomingBillTotal)
    : Math.max(0, incomeBeforeNextPay - upcomingBillTotal);

  res.json({
    ...snapshot,
    safeToSpend,
    daysUntilNextPay: daysUntilPay !== null ? Math.round(daysUntilPay) : null,
    monthlyIncome,
    cashSource,
  });
}

export async function getHealthHistory(req: AuthRequest, res: Response) {
  const snapshots = await prisma.healthSnapshot.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });
  res.json(snapshots);
}
