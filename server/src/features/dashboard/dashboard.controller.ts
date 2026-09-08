import { Request, Response } from 'express';
import { createError } from '../../middleware/error.middleware';
import { getDashboardStats } from './dashboard.service';

export async function stats(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw createError('Unauthenticated', 401);
  }

  const result = await getDashboardStats({
    userId: req.user.userId,
    role: req.user.role,
  });

  res.json({ data: result });
}
