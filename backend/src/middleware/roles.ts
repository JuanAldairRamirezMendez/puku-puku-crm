import type { Response, NextFunction } from 'express';
import type { AuthRequest, Rol } from '../types/index.js';

export function requireRole(...rolesPermitidos: Rol[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }
    if (!rolesPermitidos.includes(req.usuario.rol as Rol)) {
      res.status(403).json({
        error: `Acceso restringido. Rol requerido: ${rolesPermitidos.join(' o ')}.`,
      });
      return;
    }
    next();
  };
}
