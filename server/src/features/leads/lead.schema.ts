import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Lead creation/update schemas (used by PATCH /api/leads/:id and public capture)
// ─────────────────────────────────────────────────────────────────────────────

export const leadUpdateSchema = z.object({
  name:    z.string().trim().min(1).max(255).optional(),
  email:   z.string().trim().email().max(255).optional(),
  phone:   z.string().trim().max(50).optional(),
  company: z.string().trim().max(255).optional(),
  message: z.string().trim().max(5000).optional(),
  status:  z.nativeEnum(LeadStatus).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Query parameters for GET /api/leads
// ─────────────────────────────────────────────────────────────────────────────

export const leadListQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(10),
  status:      z.nativeEnum(LeadStatus).optional(),
  assignedTo:  z.string().cuid().optional(),   // CUIDs only — UUID format correctly rejected
  search:      z.string().trim().max(255).optional(),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
