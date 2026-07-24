import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Note creation schema – used for POST /api/leads/:id/notes
// ─────────────────────────────────────────────────────────────────────────────

export const noteCreateSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
