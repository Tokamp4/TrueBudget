import { Request, Response, NextFunction } from 'express';

export function verifyCronSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
