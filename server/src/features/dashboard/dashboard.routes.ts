import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { stats } from './dashboard.controller';

const router = Router();

router.use(authMiddleware);
router.get('/stats', stats);

export default router;
