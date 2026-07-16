const express = require('express');
const { listar, crear, iniciar, completar, asignar, registrarConversion } = require('../controllers/ab-test.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth, requireRole('ADMINISTRADOR', 'GERENTE'));

router.get('/', listar);
router.post('/', crear);
router.post('/:id/iniciar', iniciar);
router.post('/:id/completar', completar);
router.post('/asignar', asignar);
router.post('/conversion/:id', registrarConversion);

module.exports = router;
