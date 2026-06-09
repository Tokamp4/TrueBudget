export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'SEMIMONTHLY' | 'MONTHLY';

export type BillCategory =
  | 'HOUSING' | 'UTILITIES' | 'FOOD' | 'TRANSPORTATION'
  | 'HEALTHCARE' | 'DEBT' | 'INSURANCE' | 'CHILDCARE'
  | 'SUBSCRIPTIONS' | 'OTHER';

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  nextPayDate: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: BillCategory;
  isPaid: boolean;
  isRecurring: boolean;
  consequenceSeverity: number; // 1–5
  priorityScore?: number;
  notes?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  note?: string;
  source?: string;
}

export interface HealthSnapshot {
  id: string;
  score: number;
  bufferDays: number;
  billPayRate: number;
  debtToIncome: number;
  safeToSpend?: number;
  daysUntilNextPay?: number;
  monthlyIncome?: number;
  createdAt: string;
}

export interface ConnectedBank {
  id: string;
  institution: string;
  createdAt: string;
}
