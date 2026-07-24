import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ─────────────────────────────────────────────────────────────────────────────
// Augment Express's Request type so TypeScript knows about req.user
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  role:   string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────────────────────────────────────

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token  = authHeader.slice(7); // strip "Bearer "
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    // Configuration error — do not leak details to the client
    console.error('[auth] JWT_SECRET is not set');
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
