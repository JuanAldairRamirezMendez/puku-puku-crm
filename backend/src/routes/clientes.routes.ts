import { Router } from 'express';
import {
  buscar,
  crear,
  obtenerDetalle,
  actualizar,
  obtenerChurnScore,
} from '../controllers/clientes.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { crearClienteSchema, actualizarClienteSchema } from '../schemas/cliente.schema';

const router = Router();

router.use(requireAuth);

router.get('/buscar', buscar);
router.post('/', validate(crearClienteSchema), crear);
router.get('/:id', obtenerDetalle);
router.get('/:id/churn-score', obtenerChurnScore);
router.patch('/:id', validate(actualizarClienteSchema), actualizar);

export default router;
