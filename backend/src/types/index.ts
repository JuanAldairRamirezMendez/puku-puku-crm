import type { Request } from 'express';

export interface UsuarioPayload {
  id: string;
  nombre: string;
  rol: 'ADMINISTRADOR' | 'GERENTE' | 'COLABORADOR';
}

export interface AuthRequest extends Request {
  usuario?: UsuarioPayload;
}

export type CanalOrigen = 'WHATSAPP' | 'PRESENCIAL' | 'MESSENGER' | 'INSTAGRAM' | 'LLAMADA' | 'OTRO';
export type Satisfaccion = 'SATISFECHO' | 'NEUTRO' | 'INSATISFECHO';
export type Rol = 'ADMINISTRADOR' | 'GERENTE' | 'COLABORADOR';
export type EstadoInteraccion = 'PENDIENTE' | 'RESUELTO';
