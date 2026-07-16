import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = (result as any).error?.flatten?.()?.fieldErrors;
      const first = errors ? Object.values(errors).flat()[0] : 'Datos inválidos.';
      res.status(400).json({ error: first || 'Datos inválidos.', errors });
      return;
    }
    (req as any)[source] = result.data;
    next();
  };
}
