const express = require('express');
const { login, registrar } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.post('/login', login);
router.post('/registrar', requireAuth, requireRole('ADMINISTRADOR'), registrar);

module.exports = router;
