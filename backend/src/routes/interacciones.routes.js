const express = require('express');
const { crear, cerrar } = require('../controllers/interacciones.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Se monta en dos puntos desde app.js:
//  POST  /api/clientes/:id/interacciones  -> crear()   (Pantalla 2)
//  PATCH /api/interacciones/:id/cerrar    -> cerrar()  (Pantalla 3)
router.post('/clientes/:id/interacciones', crear);
router.patch('/interacciones/:id/cerrar', cerrar);

module.exports = router;
