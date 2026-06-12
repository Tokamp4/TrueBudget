import { Transaction } from '@prisma/client';
import { addDays } from 'date-fns';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// US state codes and country suffixes commonly appended to merchant names by card networks
const LOCATION_SUFFIXES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'US', 'USA',
]);

export type Cadence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

const CADENCE_INTERVAL_DAYS: Record<Cadence, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

export interface Suggestion {
  merchant: string;
  amount: number;
  cadence: string;
  nextDate: Date;
  type: 'INCOME' | 'EXPENSE';
  confidence: 'high' | 'medium';
  sourceTransactionIds: string[];
}

export function normalizeMerchant(name: string): string {
  let result = name.toUpperCase();

  // Drop common payment-processor prefixes (e.g. "SQ *", "TST* ")
  result = result.replace(/^(SQ|TST|SP|PY|IC|POS)\s*\*+\s*/, '');

  // Strip digits (store numbers, transaction IDs, embedded dates)
  result = result.replace(/[0-9]/g, '');

  // Replace remaining punctuation/symbols with spaces
  result = result.replace(/[^A-Z\s]/g, ' ');

  const tokens = result.split(/\s+/).filter(Boolean);

  // Strip trailing location codes (e.g. "WALMART SUPERCENTER TX" -> "WALMART SUPERCENTER")
  while (tokens.length > 1 && LOCATION_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  return tokens.join(' ').slice(0, 30).trim();
}

export function detectCadence(dates: Date[]): Cadence | null {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / MS_PER_DAY);
  }

  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

  if (avgGap >= 6 && avgGap <= 8) return 'WEEKLY';
  if (avgGap >= 13 && avgGap <= 16) return 'BIWEEKLY';
  if (avgGap >= 28 && avgGap <= 33) return 'MONTHLY';
  return null;
}

export function isAmountConsistent(amounts: number[]): boolean {
  if (amounts.length === 0) return false;

  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  if (avg === 0) return false;

  const variance = amounts.reduce((sum, a) => sum + (a - avg) ** 2, 0) / amounts.length;
  const coefficientOfVariation = Math.sqrt(variance) / Math.abs(avg);

  return coefficientOfVariation < 0.15;
}

export function predictNextDate(dates: Date[], cadence: string): Date {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const last = sorted[sorted.length - 1];
  const intervalDays = CADENCE_INTERVAL_DAYS[cadence as Cadence] ?? 30;
  return addDays(last, intervalDays);
}

export function detectRecurring(transactions: Transaction[]): Suggestion[] {
  const groups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const merchant = normalizeMerchant(txn.note ?? '');
    if (!merchant) continue;

    const key = `${txn.type}::${merchant}`;
    const group = groups.get(key);
    if (group) group.push(txn);
    else groups.set(key, [txn]);
  }

  const suggestions: Suggestion[] = [];

  for (const txns of groups.values()) {
    if (txns.length < 2) continue;

    const dates = txns.map((t) => t.date);
    const amounts = txns.map((t) => Math.abs(t.amount));

    const cadence = detectCadence(dates);
    if (!cadence) continue;
    if (!isAmountConsistent(amounts)) continue;

    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

    suggestions.push({
      merchant: normalizeMerchant(txns[0].note ?? ''),
      amount: Math.round(avgAmount * 100) / 100,
      cadence,
      nextDate: predictNextDate(dates, cadence),
      type: txns[0].type,
      confidence: txns.length >= 3 ? 'high' : 'medium',
      sourceTransactionIds: txns.map((t) => t.id),
    });
  }

  return suggestions;
}
