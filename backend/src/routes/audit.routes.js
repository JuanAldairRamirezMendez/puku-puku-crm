const express = require('express');
const { listar } = require('../controllers/audit.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMINISTRADOR'));

router.get('/', listar);

module.exports = router;
