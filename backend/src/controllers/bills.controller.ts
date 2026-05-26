import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { BillCategory } from '@prisma/client';

const billSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  category: z.nativeEnum(BillCategory),
  isPaid: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  consequenceSeverity: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

// Priority score: higher = pay sooner
function calcPriorityScore(dueDate: Date, severity: number): number {
  const daysUntilDue = Math.max(0, (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgency = Math.max(0, 10 - Math.min(daysUntilDue, 10)); // 0–10
  return urgency * 0.6 + severity * 2;
}

export async function getBills(req: AuthRequest, res: Response) {
  const bills = await prisma.bill.findMany({
    where: { userId: req.userId! },
    orderBy: { dueDate: 'asc' },
  });

  const withPriority = bills.map((b) => ({
    ...b,
    priorityScore: calcPriorityScore(b.dueDate, b.consequenceSeverity),
  }));

  withPriority.sort((a, b) => b.priorityScore - a.priorityScore);
  res.json(withPriority);
}

export async function createBill(req: AuthRequest, res: Response) {
  const result = billSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const bill = await prisma.bill.create({
    data: { ...result.data, userId: req.userId!, dueDate: new Date(result.data.dueDate) },
  });
  res.status(201).json(bill);
}

export async function updateBill(req: AuthRequest, res: Response) {
  const result = billSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const bill = await prisma.bill.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  const updated = await prisma.bill.update({
    where: { id: req.params.id },
    data: { ...result.data, ...(result.data.dueDate ? { dueDate: new Date(result.data.dueDate) } : {}) },
  });
  res.json(updated);
}

export async function deleteBill(req: AuthRequest, res: Response) {
  const bill = await prisma.bill.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  await prisma.bill.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
