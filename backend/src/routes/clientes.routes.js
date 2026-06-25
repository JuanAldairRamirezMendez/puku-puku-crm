const express = require('express');
const {
  buscar,
  crear,
  obtenerDetalle,
  actualizar,
} = require('../controllers/clientes.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas de este módulo requieren sesión de colaborador
router.use(requireAuth);

router.get('/buscar', buscar);          // Pantalla 1: barra de búsqueda
router.post('/', crear);                // Pantalla 1: formulario de registro
router.get('/:id', obtenerDetalle);     // Pantalla 2: tarjeta + historial
router.patch('/:id', actualizar);       // Edición de preferencias/alergias

module.exports = router;
