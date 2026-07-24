import { Router } from 'express';
import { submitLead } from './public.controller';

const router = Router();

// POST /api/public/leads — no authentication
router.post('/leads', submitLead);

export default router;
