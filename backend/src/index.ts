import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'truebudget-api' }));
app.use('/api', router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 TrueBudget API running at http://localhost:${PORT}`);
});
