const prisma = require('../config/db');

/**
 * POST /api/clientes/:id/interacciones
 * Se dispara cuando el colaborador atiende a un cliente (cualquier canal).
 * Abre el registro que luego se cierra en Pantalla 3 (US02, US03).
 */
async function crear(req, res, next) {
  try {
    const { id: clienteId } = req.params;
    const { canal, resumenPedido } = req.body;
    const colaboradorId = req.usuario.id;

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const interaccion = await prisma.interaccion.create({
      data: {
        clienteId,
        canal,
        resumenPedido: resumenPedido || null,
        colaboradorId,
        estado: 'PENDIENTE',
      },
    });

    return res.status(201).json(interaccion);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/interacciones/:id/cerrar
 * Pantalla 3 — Registro post-atención. Diseñado para completarse en ≤45s:
 * resumen del pedido, toggle de actualización de preferencia, observación
 * libre y selector de satisfacción (3 íconos). Alimenta directamente
 * ticket_promedio_soles, frecuencia_visita y producto_favorito de APF3.
 */
async function cerrar(req, res, next) {
  try {
    const { id } = req.params;
    const {
      resumenPedido,
      montoSoles,
      actualizoPreferencia,
      productoFavoritoNuevo,
      observacion,
      satisfaccion,
    } = req.body;

    const interaccion = await prisma.interaccion.findUnique({ where: { id } });
    if (!interaccion) return res.status(404).json({ error: 'Interacción no encontrada.' });

    // Evita race condition: si ya está resuelta, se rechaza el cierre.
    // Dos colaboradores no pueden cerrar la misma interacción dos veces.
    if (interaccion.estado === 'RESUELTO') {
      return res.status(409).json({
        error: 'Esta interacción ya fue cerrada por otro colaborador.',
      });
    }

    const [interaccionActualizada] = await prisma.$transaction(async (tx) => {
      const actualizada = await tx.interaccion.update({
        where: { id },
        data: {
          resumenPedido: resumenPedido ?? interaccion.resumenPedido,
          montoSoles: montoSoles !== undefined ? montoSoles : interaccion.montoSoles,
          actualizoPreferencia: !!actualizoPreferencia,
          observacion: observacion || null,
          satisfaccion: satisfaccion || null,
          estado: 'RESUELTO',
          cerradaEn: new Date(),
        },
      });

      if (actualizoPreferencia && productoFavoritoNuevo) {
        await tx.cliente.update({
          where: { id: interaccion.clienteId },
          data: { productoFavorito: productoFavoritoNuevo },
        });
      }

      return [actualizada];
    });

    return res.json(interaccionActualizada);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, cerrar };
