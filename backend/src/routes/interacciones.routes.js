const express = require('express');
const { crear, cerrar } = require('../controllers/interacciones.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { crearInteraccionSchema, cerrarInteraccionSchema } = require('../schemas/interaccion.schema');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.use(requireAuth);

router.post('/clientes/:id/interacciones', validate(crearInteraccionSchema), audit('INTERACCION.CREAR'), crear);
router.patch('/interacciones/:id/cerrar', validate(cerrarInteraccionSchema), audit('INTERACCION.CERRAR'), cerrar);

module.exports = router;
