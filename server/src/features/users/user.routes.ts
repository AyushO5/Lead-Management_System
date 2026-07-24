import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { list } from './user.controller';

const router = Router();

// GET /api/users — authenticated + ADMIN only
router.get('/', authMiddleware, requireRole('ADMIN'), list);

export default router;
