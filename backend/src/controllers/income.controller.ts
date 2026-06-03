import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { Frequency } from '@prisma/client';
import { nextFuturePayDate } from '../lib/income';

const incomeSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.nativeEnum(Frequency),
  nextPayDate: z.string().datetime(),
});

export async function getIncome(req: AuthRequest, res: Response) {
  const sources = await prisma.incomeSource.findMany({
    where: { userId: req.userId! },
    orderBy: { nextPayDate: 'asc' },
  });

  const now = new Date();
  const stale = sources.filter((s) => s.nextPayDate <= now);

  if (stale.length > 0) {
    await Promise.all(
      stale.map((s) =>
        prisma.incomeSource.update({
          where: { id: s.id },
          data: { nextPayDate: nextFuturePayDate(s.nextPayDate, s.frequency) },
        })
      )
    );

    const updated = await prisma.incomeSource.findMany({
      where: { userId: req.userId! },
      orderBy: { nextPayDate: 'asc' },
    });
    return res.json(updated);
  }

  res.json(sources);
}

export async function createIncome(req: AuthRequest, res: Response) {
  const result = incomeSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const source = await prisma.incomeSource.create({
    data: { ...result.data, userId: req.userId!, nextPayDate: new Date(result.data.nextPayDate) },
  });
  res.status(201).json(source);
}

export async function updateIncome(req: AuthRequest, res: Response) {
  const result = incomeSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const source = await prisma.incomeSource.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!source) return res.status(404).json({ error: 'Income source not found' });

  const updated = await prisma.incomeSource.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      ...(result.data.nextPayDate ? { nextPayDate: new Date(result.data.nextPayDate) } : {}),
    },
  });
  res.json(updated);
}

export async function deleteIncome(req: AuthRequest, res: Response) {
  const source = await prisma.incomeSource.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!source) return res.status(404).json({ error: 'Income source not found' });

  await prisma.incomeSource.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
