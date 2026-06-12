import { Response } from 'express';
import { CountryCode, Products } from 'plaid';
import { subDays } from 'date-fns';
import { plaidClient } from '../lib/plaid';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { detectRecurring, Suggestion } from '../services/recurringDetection.service';

// Step 1: Create a link token (frontend uses this to open Plaid Link)
export async function createLinkToken(req: AuthRequest, res: Response) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: req.userId! },
    client_name: 'TrueBudget',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us, CountryCode.Ca],
    language: 'en',
  });
  res.json({ link_token: response.data.link_token });
}

// Step 2: Exchange public token for access token after user connects bank
export async function exchangePublicToken(req: AuthRequest, res: Response) {
  const { public_token } = req.body;
  if (!public_token) return res.status(400).json({ error: 'public_token required' });

  const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
  const { access_token, item_id } = exchange.data;

  // Get institution name
  const item = await plaidClient.itemGet({ access_token });
  const institutionId = item.data.item.institution_id;
  let institution = 'Unknown Bank';
  if (institutionId) {
    const inst = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    institution = inst.data.institution.name;
  }

  await prisma.plaidItem.upsert({
    where: { itemId: item_id },
    update: { accessToken: access_token },
    create: { userId: req.userId!, accessToken: access_token, itemId: item_id, institution },
  });

  res.json({ success: true, institution });
}

// Step 3: Sync transactions from Plaid
export async function syncTransactions(req: AuthRequest, res: Response) {
  const plaidItems = await prisma.plaidItem.findMany({ where: { userId: req.userId! } });
  if (plaidItems.length === 0) return res.json({ synced: 0 });

  let totalSynced = 0;

  for (const item of plaidItems) {
    const response = await plaidClient.transactionsGet({
      access_token: item.accessToken,
      start_date: '2024-01-01',
      end_date: new Date().toISOString().split('T')[0],
    });

    for (const txn of response.data.transactions) {
      const category = txn.personal_finance_category?.primary || 'OTHER';
      // Plaid's amount sign is authoritative: positive = money leaving the
      // account (expense), negative = money entering it (income/refund/credit).
      const isIncome = txn.amount < 0;

      await prisma.transaction.upsert({
        where: { plaidId: txn.transaction_id },
        update: {},
        create: {
          userId: req.userId!,
          amount: Math.abs(txn.amount),
          type: isIncome ? 'INCOME' : 'EXPENSE',
          date: new Date(txn.date),
          category,
          note: txn.name,
          source: 'plaid',
          plaidId: txn.transaction_id,
        },
      });
      totalSynced++;
    }
  }

  res.json({ synced: totalSynced });
}

export async function getSuggestions(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  const transactions = await prisma.transaction.findMany({
    where: { userId, source: 'plaid', date: { gte: subDays(new Date(), 90) } },
    orderBy: { date: 'asc' },
  });

  const suggestions = detectRecurring(transactions);

  const [bills, incomeSources] = await Promise.all([
    prisma.bill.findMany({ where: { userId } }),
    prisma.incomeSource.findMany({ where: { userId } }),
  ]);

  // A suggestion is already covered if an existing record has the same amount,
  // or its name contains the first 6 characters of the detected merchant name.
  function alreadyTracked(suggestion: Suggestion, existing: { name: string; amount: number }[]): boolean {
    const prefix = suggestion.merchant.slice(0, 6).toLowerCase();
    return existing.some((e) => e.amount === suggestion.amount || e.name.toLowerCase().includes(prefix));
  }

  const filtered = suggestions.filter((s) =>
    s.type === 'EXPENSE' ? !alreadyTracked(s, bills) : !alreadyTracked(s, incomeSources)
  );

  res.json({
    bills: filtered.filter((s) => s.type === 'EXPENSE'),
    income: filtered.filter((s) => s.type === 'INCOME'),
  });
}

export async function getConnectedBanks(req: AuthRequest, res: Response) {
  const items = await prisma.plaidItem.findMany({
    where: { userId: req.userId! },
    select: { id: true, institution: true, createdAt: true },
  });
  res.json(items);
}
