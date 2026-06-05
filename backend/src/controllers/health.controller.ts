import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { addDays } from 'date-fns';
import { nextFuturePayDate } from '../lib/income';

/**
 * Financial Health Score (0–100):
 *   40pts — bill pay rate (% paid on time)
 *   30pts — buffer days (days of expenses covered, capped at 7)
 *   30pts — debt-to-income ratio (lower is better, capped at 0)
 */
export async function computeHealthScore(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  const [bills, income, transactions] = await Promise.all([
    prisma.bill.findMany({ where: { userId } }),
    prisma.incomeSource.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: addDays(new Date(), -30) } },
    }),
  ]);

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

  // Monthly expenses
  const monthlyExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Monthly debt payments
  const debtBills = bills.filter((b) => b.category === 'DEBT');
  const monthlyDebt = debtBills.reduce((sum, b) => sum + b.amount, 0);

  // Debt-to-income ratio
  const debtToIncome = monthlyIncome > 0 ? monthlyDebt / monthlyIncome : 1;

  // Buffer days: days of expenses covered by available cash.
  // Uses transaction history when available; falls back to income sources for new users.
  const dailyExpense = monthlyExpenses / 30 || monthlyIncome / 30 || 1;
  const lastIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const cashEstimate = lastIncome > 0 ? lastIncome : monthlyIncome;
  const bufferDays = Math.min(cashEstimate / dailyExpense, 14); // cap at 14 days

  // Score calculation.
  // Bill score is only awarded when the user actually has bills — no free points for an empty account.
  const billScore = bills.length > 0 ? billPayRate * 40 : 0;
  const bufferScore = (Math.min(bufferDays, 7) / 7) * 30;
  const debtScore = Math.max(0, 1 - debtToIncome) * 30;
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

  // Safe-to-spend: money arriving before next payday minus bills due before then.
  const safeToSpend = Math.max(0, incomeBeforeNextPay - upcomingBillTotal);

  res.json({
    ...snapshot,
    safeToSpend,
    daysUntilNextPay: daysUntilPay !== null ? Math.round(daysUntilPay) : null,
    monthlyIncome,
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
