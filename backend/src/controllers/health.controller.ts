import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { Frequency } from '@prisma/client';

/** Advance a past nextPayDate forward by its frequency until it's in the future. */
function nextFuturePayDate(date: Date, frequency: Frequency): Date {
  const now = new Date();
  let d = new Date(date);
  while (d <= now) {
    switch (frequency) {
      case 'WEEKLY':      d = addWeeks(d, 1);  break;
      case 'BIWEEKLY':    d = addWeeks(d, 2);  break;
      case 'SEMIMONTHLY': d = addDays(d, 15);  break;
      case 'MONTHLY':     d = addMonths(d, 1); break;
    }
  }
  return d;
}

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

  // Bill pay rate
  const totalBills = bills.length;
  const paidBills = bills.filter((b) => b.isPaid).length;
  const billPayRate = totalBills > 0 ? paidBills / totalBills : 1;

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

  // Buffer days: estimate days covered by last income vs expenses
  const dailyExpense = monthlyExpenses / 30 || 1;
  const lastIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const bufferDays = Math.min(lastIncome / dailyExpense, 14); // cap at 14 days

  // Score calculation
  const billScore = billPayRate * 40;
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
    : Date.now() + 7 * 24 * 60 * 60 * 1000;
  const daysUntilPay = (nextPay - Date.now()) / (1000 * 60 * 60 * 24);

  const upcomingBillTotal = bills
    .filter((b) => !b.isPaid && b.dueDate.getTime() <= nextPay)
    .reduce((sum, b) => sum + b.amount, 0);

  const estimatedBalance = lastIncome; // approximation; replace with Plaid balance
  const safeToSpend = Math.max(0, estimatedBalance - upcomingBillTotal);

  res.json({ ...snapshot, safeToSpend, daysUntilNextPay: Math.round(daysUntilPay), monthlyIncome });
}

export async function getHealthHistory(req: AuthRequest, res: Response) {
  const snapshots = await prisma.healthSnapshot.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });
  res.json(snapshots);
}
