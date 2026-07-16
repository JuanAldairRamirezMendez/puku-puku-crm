const express = require('express');
const { listar, obtener, comparativa } = require('../controllers/experiments.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth, requireRole('ADMINISTRADOR', 'GERENTE'));

router.get('/', listar);
router.get('/comparativa', comparativa);
router.get('/:id', obtener);

module.exports = router;
