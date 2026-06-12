import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';
import { prisma } from '../lib/prisma';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string) {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };

  return jwt.sign({ userId }, process.env.JWT_SECRET!, options);
}

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { email, password, firstName, lastName } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      email, passwordHash, firstName, lastName,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: addHours(new Date(), 24),
    },
  });

  // Send verification email — fire-and-forget so a mail failure doesn't block registration
  sendVerificationEmail(email, firstName, verificationToken)
    .then(() => console.log(`[email] Verification email sent to ${email}`))
    .catch((err) => {
      console.error('[email] Failed to send verification email:');
      console.error('  Status :', err?.statusCode ?? err?.status ?? 'unknown');
      console.error('  Message:', err?.message ?? JSON.stringify(err));
    });

  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, email, firstName, lastName, emailVerified: false },
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
  });

  if (!user) return res.status(400).json({ error: 'Invalid verification link' });

  if (user.emailVerified) return res.json({ message: 'Email already verified' });

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    return res.status(400).json({ error: 'Verification link has expired' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  res.json({ message: 'Email verified successfully' });
}

export async function resendVerification(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

  const verificationToken = randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: addHours(new Date(), 24),
    },
  });

  await sendVerificationEmail(user.email, user.firstName, verificationToken);
  res.json({ message: 'Verification email sent' });
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond with success to prevent email enumeration
  if (!user) return res.json({ message: 'If that address exists, a reset link has been sent.' });

  const resetToken = randomBytes(32).toString('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: addHours(new Date(), 1),
    },
  });

  sendPasswordResetEmail(user.email, user.firstName, resetToken)
    .then(() => console.log(`[email] Password reset email sent to ${user.email}`))
    .catch((err) => {
      console.error('[email] Failed to send password reset email:');
      console.error('  Status :', err?.statusCode ?? 'unknown');
      console.error('  Message:', err?.message ?? JSON.stringify(err));
    });

  res.json({ message: 'If that address exists, a reset link has been sent.' });
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function resetPassword(req: Request, res: Response) {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { token, password } = result.data;

  const user = await prisma.user.findFirst({ where: { passwordResetToken: token } });

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

  if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  const isSamePassword = await bcrypt.compare(password, user.passwordHash);
  if (isSamePassword) {
    return res.status(400).json({ error: 'New password must be different from your current password' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  res.json({ message: 'Password reset successfully' });
}

export async function me(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, firstName: true, lastName: true, emailVerified: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export async function deleteAccount(req: Request & { userId?: string }, res: Response) {
  const result = deleteAccountSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(result.data.password, user.passwordHash);
  if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

  await prisma.user.delete({ where: { id: user.id } });
  res.json({ message: 'Account deleted' });
}
