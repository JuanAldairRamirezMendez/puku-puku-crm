/* eslint-disable no-unused-vars */

/**
 * Manejador de errores centralizado. Traduce errores conocidos de Prisma
 * a respuestas HTTP claras y evita filtrar detalles internos al cliente.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  // Prisma: violación de restricción única (ej. teléfono duplicado)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: `Ya existe un registro con ese valor único (${err.meta?.target}).`,
    });
  }

  // Prisma: registro no encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'El registro solicitado no existe.' });
  }

  const status = err.status || 500;
  return res.status(status).json({
    error: status === 500 ? 'Error interno del servidor.' : err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
