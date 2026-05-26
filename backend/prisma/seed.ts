import { PrismaClient, Frequency, BillCategory, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@clearbudget.app' },
    update: {},
    create: {
      email: 'demo@clearbudget.app',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Demo',
    },
  });

  await prisma.incomeSource.createMany({
    data: [
      {
        userId: user.id,
        name: 'Main Job — Retail',
        amount: 1350,
        frequency: Frequency.BIWEEKLY,
        nextPayDate: addDays(new Date(), 5),
      },
      {
        userId: user.id,
        name: 'Gig Work — DoorDash',
        amount: 280,
        frequency: Frequency.WEEKLY,
        nextPayDate: addDays(new Date(), 2),
      },
    ],
  });

  await prisma.bill.createMany({
    data: [
      { userId: user.id, name: 'Rent', amount: 950, dueDate: addDays(new Date(), 8), category: BillCategory.HOUSING, consequenceSeverity: 5 },
      { userId: user.id, name: 'Electricity', amount: 85, dueDate: addDays(new Date(), 3), category: BillCategory.UTILITIES, consequenceSeverity: 4 },
      { userId: user.id, name: 'Phone', amount: 55, dueDate: addDays(new Date(), 12), category: BillCategory.UTILITIES, consequenceSeverity: 2 },
      { userId: user.id, name: 'Car Insurance', amount: 120, dueDate: addDays(new Date(), 15), category: BillCategory.INSURANCE, consequenceSeverity: 3 },
      { userId: user.id, name: 'Internet', amount: 65, dueDate: addDays(new Date(), 6), category: BillCategory.UTILITIES, consequenceSeverity: 3 },
      { userId: user.id, name: 'Credit Card Min.', amount: 45, dueDate: addDays(new Date(), 10), category: BillCategory.DEBT, consequenceSeverity: 2 },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, amount: 1350, type: TransactionType.INCOME, date: subDays(new Date(), 3), category: 'Paycheck', note: 'Retail job' },
      { userId: user.id, amount: 280, type: TransactionType.INCOME, date: subDays(new Date(), 1), category: 'Gig', note: 'DoorDash weekly' },
      { userId: user.id, amount: 62, type: TransactionType.EXPENSE, date: subDays(new Date(), 2), category: 'Food', note: 'Grocery run' },
      { userId: user.id, amount: 15, type: TransactionType.EXPENSE, date: subDays(new Date(), 1), category: 'Transportation', note: 'Bus pass top-up' },
    ],
  });

  await prisma.healthSnapshot.create({
    data: {
      userId: user.id,
      score: 52,
      bufferDays: 4.2,
      billPayRate: 0.83,
      debtToIncome: 0.31,
    },
  });

  console.log('✅ Seed complete. Demo user: demo@clearbudget.app / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
