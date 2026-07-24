import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SafeUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

export interface LoginResult {
  token: string;
  user:  SafeUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/** Strip passwordHash and any other sensitive fields before sending to client. */
function toSafeUser(user: { id: string; name: string; email: string; role: string }): SafeUser {
  return {
    id:    user.id,
    name:  user.name,
    email: user.email,
    role:  user.role,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates email + password, returns a signed JWT and safe user profile.
 * Throws an error with code 'INVALID_CREDENTIALS' on mismatch.
 */
export async function loginUser(email: string, password: string): Promise<LoginResult> {
  // 1. Look up the user — include passwordHash for comparison only
  const user = await prisma.user.findUnique({ where: { email } });

  // 2. Use a constant-time comparison path regardless of whether the user exists
  //    to prevent user-enumeration via timing attacks.
  const hash = user?.passwordHash ?? '$2b$12$invalidhashusedastimingguard000000000000000';
  const match = await bcrypt.compare(password, hash);

  if (!user || !match) {
    const err = new Error('Invalid email or password') as Error & { code: string };
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // 3. Sign JWT — payload contains only userId and role
  const payload = { userId: user.id, role: user.role };
  const token   = jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' });

  return { token, user: toSafeUser(user) };
}

/**
 * Returns the safe profile of the authenticated user.
 * Used by GET /api/auth/me after the auth middleware attaches req.user.
 */
export async function getCurrentUser(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toSafeUser(user) : null;
}
