import { Request, Response, NextFunction } from 'express';
import { publicLeadSchema } from './public.schema';
import { createPublicLead } from './public.service';
import { createError } from '../../middleware/error.middleware';

// POST /api/public/leads — no authentication required
export async function submitLead(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parsed = publicLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError('Invalid lead data: ' + JSON.stringify(parsed.error.flatten().fieldErrors), 400));
    return;
  }

  try {
    const lead = await createPublicLead(parsed.data);
    res.status(201).json({ data: lead });
  } catch (err) {
    next(err);
  }
}
