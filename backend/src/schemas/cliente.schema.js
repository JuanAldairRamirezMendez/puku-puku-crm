const { z } = require('zod');

const canales = ['WHATSAPP', 'PRESENCIAL', 'MESSENGER', 'INSTAGRAM', 'LLAMADA', 'OTRO'];

const crearClienteSchema = z.object({
  nombreCompleto: z.string().min(1, 'El nombre completo es obligatorio.'),
  telefono: z.string().min(1, 'El teléfono es obligatorio.'),
  canalOrigen: z.enum(canales, { errorMap: () => ({ message: `Canal no válido. Debe ser uno de: ${canales.join(', ')}` }) }),
  productoFavorito: z.string().optional().nullable(),
  restriccionesAlergias: z.string().optional().nullable(),
  consentimientoLey29733: z.boolean({
    required_error: 'El consentimiento (Ley N.° 29733) es obligatorio.',
    invalid_type_error: 'El consentimiento debe ser true (Ley N.° 29733).',
  }).refine((v) => v === true, {
    message: 'No se puede registrar al cliente sin su consentimiento explícito (Ley N.° 29733, art. 13°).',
  }),
});

const actualizarClienteSchema = z.object({
  productoFavorito: z.string().optional().nullable(),
  restriccionesAlergias: z.string().optional().nullable(),
}).refine((d) => d.productoFavorito !== undefined || d.restriccionesAlergias !== undefined, {
  message: 'Debe enviar al menos un campo para actualizar.',
});

module.exports = { crearClienteSchema, actualizarClienteSchema };
