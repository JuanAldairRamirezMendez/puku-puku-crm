import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index.js';
import jwt from 'jsonwebtoken';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || (() => {
    const header = req.headers.authorization || '';
    const parts = header.split(' ');
    return parts[0] === 'Bearer' ? parts[1] : null;
  })();

  if (!token) {
    res.status(401).json({ error: 'Token de acceso no proporcionado.' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as Record<string, string>;
    req.usuario = { id: payload.id, nombre: payload.nombre, rol: payload.rol as 'ADMINISTRADOR' | 'GERENTE' | 'COLABORADOR' };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}
