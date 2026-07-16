const express = require('express');
const { login, registrar, me, refresh, logout } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { loginSchema, registrarSchema } = require('../schemas/auth.schema');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.post('/login', validate(loginSchema), audit('USUARIO.LOGIN'), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/registrar', requireAuth, requireRole('ADMINISTRADOR'), validate(registrarSchema), audit('USUARIO.REGISTRAR'), registrar);
router.get('/me', requireAuth, me);

module.exports = router;
