const express = require('express');
const {
  buscar,
  crear,
  obtenerDetalle,
  actualizar,
  obtenerChurnScore,
} = require('../controllers/clientes.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { crearClienteSchema, actualizarClienteSchema } = require('../schemas/cliente.schema');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.use(requireAuth);

router.get('/buscar', buscar);
router.post('/', validate(crearClienteSchema), audit('CLIENTE.CREAR'), crear);
router.get('/:id', obtenerDetalle);
router.get('/:id/churn-score', obtenerChurnScore);
router.patch('/:id', validate(actualizarClienteSchema), audit('CLIENTE.ACTUALIZAR'), actualizar);

module.exports = router;
