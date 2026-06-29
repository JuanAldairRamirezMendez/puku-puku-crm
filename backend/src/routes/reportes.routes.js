const express = require('express');
const {
  clientesFrecuentes,
  dataset,
  exportarCsv,
  analytics,
  segmentacion,
} = require('../controllers/reportes.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth, requireRole('ADMINISTRADOR', 'GERENTE'));

router.get('/clientes-frecuentes', clientesFrecuentes); // US04
router.get('/dataset', dataset);                        // US06/US07 (JSON)
router.get('/export-apf3.csv', exportarCsv);             // Insumo directo para APF3
router.get('/analytics', analytics);                     // Dashboard visual APF3
router.post('/segmentacion', segmentacion);              // K-Means clustering APF3

module.exports = router;
