import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas for request validation
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
