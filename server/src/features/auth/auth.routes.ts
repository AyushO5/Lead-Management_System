import { Router } from 'express';
import { login, me } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, me);

export default router;
