import { Router } from 'express';
import {
  clientesFrecuentes,
  dataset,
  exportarCsv,
  analytics,
  segmentacion,
  predecirChurn,
  predecirChurnCliente,
  reentrenarModelo,
} from '../controllers/reportes.controller';
import {
  entrenar,
  status,
} from '../controllers/ml.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { segmentacionSchema, predecirChurnSchema } from '../schemas/reporte.schema';

const router = Router();

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
router.get('/entrenar/status', status);

export default router;
