import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'truebudget-api' }));
app.use('/api', router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 TrueBudget API running at http://localhost:${PORT}`);
});
