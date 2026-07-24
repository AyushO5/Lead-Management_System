import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { list, create } from './note.controller';

const router = Router({ mergeParams: true }); // mergeParams to get :id from parent leads router

router.use(authMiddleware);
router.get('/', list);
router.post('/', create);

export default router;
