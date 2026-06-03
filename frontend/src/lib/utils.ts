import { format, differenceInDays } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export function formatDate(date: string | Date): string {
  // Extract year/month/day from the ISO string directly to avoid UTC-to-local
  // timezone shifting (e.g. 2026-06-01T00:00:00Z rendering as May 31 locally).
  const iso = typeof date === 'string' ? date : date.toISOString();
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return format(new Date(year, month - 1, day), 'MMM d, yyyy');
}

export function daysUntil(date: string | Date): number {
  const iso = typeof date === 'string' ? date : date.toISOString();
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return differenceInDays(new Date(year, month - 1, day), new Date());
}

export function severityLabel(score: number): string {
  const labels: Record<number, string> = {
    1: 'Low', 2: 'Minor', 3: 'Moderate', 4: 'High', 5: 'Critical',
  };
  return labels[score] || 'Unknown';
}

export function severityColor(score: number): string {
  if (score >= 5) return 'text-red-600 bg-red-50';
  if (score >= 4) return 'text-orange-600 bg-orange-50';
  if (score >= 3) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

export function healthScoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

export function frequencyLabel(freq: string): string {
  const labels: Record<string, string> = {
    WEEKLY: 'Weekly', BIWEEKLY: 'Every 2 weeks',
    SEMIMONTHLY: 'Twice a month', MONTHLY: 'Monthly',
  };
  return labels[freq] || freq;
}
