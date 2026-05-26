import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { TransactionType } from '@prisma/client';

const txnSchema = z.object({
  amount: z.number().positive(),
  type: z.nativeEnum(TransactionType),
  date: z.string().datetime(),
  category: z.string().min(1),
  note: z.string().optional(),
});

export async function getTransactions(req: AuthRequest, res: Response) {
  const { limit = '50', offset = '0' } = req.query as Record<string, string>;
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId! },
    orderBy: { date: 'desc' },
    take: parseInt(limit),
    skip: parseInt(offset),
  });
  res.json(transactions);
}

export async function createTransaction(req: AuthRequest, res: Response) {
  const result = txnSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const txn = await prisma.transaction.create({
    data: {
      ...result.data,
      userId: req.userId!,
      date: new Date(result.data.date),
      source: 'manual',
    },
  });
  res.status(201).json(txn);
}

export async function deleteTransaction(req: AuthRequest, res: Response) {
  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
