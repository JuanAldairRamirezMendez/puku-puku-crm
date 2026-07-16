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
  entrenarStream,
} = require('../controllers/ml.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { segmentacionSchema, predecirChurnSchema } = require('../schemas/reporte.schema');

const router = express.Router();

router.use(requireAuth);
router.get('/export-apf3.csv', exportarCsv);
router.use(requireRole('ADMINISTRADOR', 'GERENTE'));

router.get('/clientes-frecuentes', clientesFrecuentes);
router.get('/dataset', dataset);
router.get('/analytics', analytics);
router.post('/segmentacion', validate(segmentacionSchema), segmentacion);
router.post('/predecir-churn', validate(predecirChurnSchema), predecirChurn);
router.get('/predecir-churn/:id', predecirChurnCliente);
router.post('/entrenar-modelo', reentrenarModelo);
router.post('/entrenar', entrenar);
router.post('/entrenar-stream', entrenarStream);
router.get('/entrenar/status', status);

module.exports = router;
