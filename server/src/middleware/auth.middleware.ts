import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const authPayloadSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export type AuthPayload = z.infer<typeof authPayloadSchema>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[auth] JWT_SECRET is not set');
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);
    const parsed = authPayloadSchema.safeParse(decoded);

    if (!parsed.success) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = parsed.data;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
