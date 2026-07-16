import { z } from 'zod';

export const crearInteraccionSchema = z.object({
  canal: z.string().min(1, 'El canal es obligatorio.'),
  resumenPedido: z.string().optional().nullable(),
});

export const cerrarInteraccionSchema = z.object({
  resumenPedido: z.string().optional().nullable(),
  montoSoles: z.number().positive('El monto debe ser un número positivo.').optional().nullable(),
  actualizoPreferencia: z.boolean().optional(),
  productoFavoritoNuevo: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  satisfaccion: z.enum(['SATISFECHO', 'NEUTRO', 'INSATISFECHO']).optional().nullable(),
});
