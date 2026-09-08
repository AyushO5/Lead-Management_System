import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Lead creation/update schemas (used by PATCH /api/leads/:id and public capture)
// ─────────────────────────────────────────────────────────────────────────────

export const leadUpdateSchema = z.object({
  name:    z.string().max(255).optional(),
  email:   z.string().email().optional(),
  phone:   z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  message: z.string().max(5000).optional(),
  status:  z.nativeEnum(LeadStatus).optional(),
});

export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Query parameters for GET /api/leads
// ─────────────────────────────────────────────────────────────────────────────

export const leadListQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(10),
  status:      z.nativeEnum(LeadStatus).optional(),
  // User IDs are Prisma CUIDs, not UUIDs.
  assignedTo:  z.string().min(1).optional(),
  search:      z.string().max(255).optional(),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
