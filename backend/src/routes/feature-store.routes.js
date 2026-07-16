const express = require('express');
const { listarFeatures, crearFeature, valoresCliente } = require('../controllers/feature-store.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth, requireRole('ADMINISTRADOR', 'GERENTE'));

router.get('/', listarFeatures);
router.post('/', crearFeature);
router.get('/cliente/:clienteId', valoresCliente);

module.exports = router;
