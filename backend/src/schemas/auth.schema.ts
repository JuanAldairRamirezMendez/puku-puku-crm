import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('El formato del correo no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const registrarSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio.'),
  email: z.string().email('El formato del correo no es válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  rol: z.enum(['ADMINISTRADOR', 'GERENTE', 'COLABORADOR']).optional(),
});
