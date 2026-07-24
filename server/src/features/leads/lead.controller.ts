import { Request, Response } from 'express';
import {
  listLeads,
  getLead,
  updateLead,
  deleteLead,
  assignLead,
  getLeadActivities,
} from './lead.service';
import { leadUpdateSchema, leadListQuerySchema } from './lead.schema';
import { createError } from '../../middleware/error.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function requester(req: Request) {
  if (!req.user) throw createError('Unauthenticated', 401);
  return { userId: req.user.userId, role: req.user.role };
}

// GET /api/leads
export async function list(req: Request, res: Response) {
  const parsed = leadListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createError('Invalid query parameters', 400);
  }
  const result = await listLeads(parsed.data, requester(req));
  res.json({ data: result.data, pagination: result.pagination });
}

// GET /api/leads/:id – details
export async function get(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const lead = await getLead(id, requester(req));
  if (!lead) throw createError('Lead not found or access denied', 404);
  res.json({ data: lead });
}

// PATCH /api/leads/:id – update fields (including status)
export async function update(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const parsed = leadUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body', 400);
  }

  const updated = await updateLead(id, parsed.data, requester(req));
  res.json({ data: updated });
}

// DELETE /api/leads/:id – admin only (middleware will enforce)
export async function remove(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  await deleteLead(id);
  res.status(204).send();
}

// PATCH /api/leads/:id/assign – admin only
export async function assign(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { userId } = req.body;
  if (!userId) throw createError('userId is required', 400);
  const updated = await assignLead(id, userId, requester(req).userId);
  res.json({ data: updated });
}

// GET /api/leads/:id/activities – list activities
export async function activities(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const acts = await getLeadActivities(id, requester(req));
  res.json({ data: acts });
}
