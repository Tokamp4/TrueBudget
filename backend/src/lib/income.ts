import { Frequency } from '@prisma/client';
import { addDays, addWeeks, addMonths } from 'date-fns';

export function nextFuturePayDate(date: Date, frequency: Frequency): Date {
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
