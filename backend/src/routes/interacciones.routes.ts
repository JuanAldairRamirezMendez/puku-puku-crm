import { Router } from 'express';
import { crear, cerrar } from '../controllers/interacciones.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { crearInteraccionSchema, cerrarInteraccionSchema } from '../schemas/interaccion.schema';

const router = Router();

router.use(requireAuth);

router.post('/clientes/:id/interacciones', validate(crearInteraccionSchema), crear);
router.patch('/interacciones/:id/cerrar', validate(cerrarInteraccionSchema), cerrar);

export default router;
