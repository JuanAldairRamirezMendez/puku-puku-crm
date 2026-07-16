const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware que registra una acción en el log de auditoría.
 * Uso: router.post('/ruta', audit('CLIENTE.CREAR'), controller)
 */
function audit(accion) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const detalle = {
        metodo: req.method,
        ruta: req.originalUrl,
        statusCode: res.statusCode,
        ...(req.params && Object.keys(req.params).length ? { params: req.params } : {}),
        ...(res.statusCode >= 400 ? { error: body?.error } : {}),
      };

      prisma.auditLog.create({
        data: {
          usuarioId: req.usuario?.id || null,
          accion,
          detalle: JSON.stringify(detalle),
          ip: req.ip || req.headers['x-forwarded-for'] || null,
        },
      }).catch(() => {});

      return originalJson(body);
    };

    next();
  };
}

module.exports = { audit };
