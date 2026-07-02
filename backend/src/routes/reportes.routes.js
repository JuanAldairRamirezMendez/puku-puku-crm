const express = require('express');
const {
  clientesFrecuentes,
  dataset,
  exportarCsv,
  analytics,
  segmentacion,
  predecirChurn,
  predecirChurnCliente,
  reentrenarModelo,
} = require('../controllers/reportes.controller');
const {
  entrenar,
  status,
} = require('../controllers/ml.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth, requireRole('ADMINISTRADOR', 'GERENTE'));

router.get('/clientes-frecuentes', clientesFrecuentes); // US04
router.get('/dataset', dataset);                        // US06/US07 (JSON)
router.get('/export-apf3.csv', exportarCsv);             // Insumo directo para APF3
router.get('/analytics', analytics);                     // Dashboard visual APF3
router.post('/segmentacion', segmentacion);              // K-Means clustering APF3
router.post('/predecir-churn', predecirChurn);           // ML: predecir churn (batch body)
router.get('/predecir-churn/:id', predecirChurnCliente); // ML: predecir churn por cliente
router.post('/entrenar-modelo', reentrenarModelo);       // ML: reentrenar desde datos CRM
router.post('/entrenar', entrenar);                      // ML Churn training (synthetic)
router.get('/entrenar/status', status);                  // Training status & results

module.exports = router;
