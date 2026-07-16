import { Router } from 'express';
import { login, registrar, me, refresh, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registrarSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/registrar', requireAuth, requireRole('ADMINISTRADOR'), validate(registrarSchema), registrar);
router.get('/me', requireAuth, me);

export default router;
