const express = require('express');
const { login, registrar, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.post('/login', login);
router.post('/registrar', requireAuth, requireRole('ADMINISTRADOR'), registrar);
router.get('/me', requireAuth, me);

module.exports = router;
