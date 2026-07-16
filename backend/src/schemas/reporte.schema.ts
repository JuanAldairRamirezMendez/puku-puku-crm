import { z } from 'zod';

export const segmentacionSchema = z.object({
  k: z.number().int().min(2, 'k debe ser al menos 2.').max(10, 'k máximo 10.').optional().default(3),
});

export const predecirChurnSchema = z.object({
  frecuencia: z.number().min(0, 'frecuencia debe ser >= 0.'),
  ticketPromedio: z.number().min(0, 'ticketPromedio debe ser >= 0.'),
  gastoMensual: z.number().min(0, 'gastoMensual debe ser >= 0.'),
  diasInactivo: z.number().int().min(0, 'diasInactivo debe ser >= 0.'),
});
