import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  list,
  get,
  update,
  remove,
  assign,
  activities,
} from './lead.controller';

const router = Router();

// Public list – auth required for all lead routes
router.use(authMiddleware);

// List & filters – both roles can access (member restriction handled in service)
router.get('/', list);
router.get('/:id', get);
router.patch('/:id', update);
router.delete('/:id', requireRole('ADMIN'), remove);
router.patch('/:id/assign', requireRole('ADMIN'), assign);
router.get('/:id/activities', activities);

export default router;
