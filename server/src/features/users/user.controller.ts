import { Request, Response } from 'express';
import { listUsers } from './user.service';

// GET /api/users — ADMIN only (enforced by route middleware)
export async function list(req: Request, res: Response): Promise<void> {
  const users = await listUsers();
  res.json({ data: users });
}
