import type { Request, Response, NextFunction } from 'express';

interface PrismaError extends Error {
  code?: string;
  meta?: { target?: string };
  status?: number;
}

export function errorHandler(err: PrismaError, req: Request, res: Response, _next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  if (err.code === 'P2002') {
    res.status(409).json({
      error: `Ya existe un registro con ese valor único (${err.meta?.target}).`,
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({ error: 'El registro solicitado no existe.' });
    return;
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor.' : err.message,
  });
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}
