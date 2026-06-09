import { Router } from 'express';
import { register, login, me, verifyEmail, resendVerification, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { getBills, createBill, updateBill, deleteBill } from '../controllers/bills.controller';
import { getIncome, createIncome, updateIncome, deleteIncome } from '../controllers/income.controller';
import { getTransactions, createTransaction, deleteTransaction } from '../controllers/transactions.controller';
import { computeHealthScore, getHealthHistory } from '../controllers/health.controller';
import { createLinkToken, exchangePublicToken, syncTransactions, getConnectedBanks } from '../controllers/plaid.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);
router.get('/auth/verify-email', verifyEmail);
router.post('/auth/resend-verification', authenticate, resendVerification);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Bills
router.get('/bills', authenticate, getBills);
router.post('/bills', authenticate, createBill);
router.put('/bills/:id', authenticate, updateBill);
router.delete('/bills/:id', authenticate, deleteBill);

// Income
router.get('/income', authenticate, getIncome);
router.post('/income', authenticate, createIncome);
router.put('/income/:id', authenticate, updateIncome);
router.delete('/income/:id', authenticate, deleteIncome);

// Transactions
router.get('/transactions', authenticate, getTransactions);
router.post('/transactions', authenticate, createTransaction);
router.delete('/transactions/:id', authenticate, deleteTransaction);

// Health Score
router.get('/health/score', authenticate, computeHealthScore);
router.get('/health/history', authenticate, getHealthHistory);

// Plaid
router.post('/plaid/link-token', authenticate, createLinkToken);
router.post('/plaid/exchange-token', authenticate, exchangePublicToken);
router.post('/plaid/sync', authenticate, syncTransactions);
router.get('/plaid/banks', authenticate, getConnectedBanks);

export default router;
