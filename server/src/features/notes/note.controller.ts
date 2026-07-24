import { Request, Response } from 'express';
import { noteCreateSchema } from './note.schema';
import { getLeadNotes, addNote } from './note.service';
import { createError } from '../../middleware/error.middleware';

function requester(req: Request) {
  if (!req.user) throw createError('Unauthenticated', 401);
  return { userId: req.user.userId, role: req.user.role };
}

// GET /api/leads/:id/notes
export async function list(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const notes = await getLeadNotes(id, requester(req));
  res.json({ data: notes });
}

// POST /api/leads/:id/notes
export async function create(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const parsed = noteCreateSchema.safeParse(req.body);
  if (!parsed.success) throw createError('Invalid note payload', 400);
  const note = await addNote(id, parsed.data, requester(req));
  // addNote returns an array [note, activity]; pick the note
  res.status(201).json({ data: note[0] });
}
