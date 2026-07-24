import { Request, Response } from 'express';
import { loginSchema } from './auth.schema';
import { loginUser, getCurrentUser } from './auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  // 1. Validate request body
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const result = await loginUser(email, password);
    res.status(200).json({ data: result });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as Error & { code?: string }).code === 'INVALID_CREDENTIALS'
    ) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    // Unexpected error — surface as 500
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me   (requires auth middleware)
// ─────────────────────────────────────────────────────────────────────────────

export async function me(req: Request, res: Response): Promise<void> {
  // req.user is guaranteed by the auth middleware
  const userId = req.user!.userId;

  const user = await getCurrentUser(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({ data: { user } });
}
