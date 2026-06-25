const prisma = require('../config/db');
const { calcularChurnLabel } = require('../utils/churn');

/**
 * GET /api/clientes/buscar?q=texto
 * Pantalla 1 — Barra de búsqueda por nombre o teléfono.
 * Si existe, el frontend carga la tarjeta del cliente (Pantalla 2).
 */
async function buscar(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombreCompleto: { contains: q, mode: 'insensitive' } },
          { telefono: { contains: q } },
        ],
      },
      take: 10,
      orderBy: { nombreCompleto: 'asc' },
    });

    return res.json(clientes);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/clientes
 * Pantalla 1 — Formulario de registro de nuevo cliente.
 * Regla de negocio NO NEGOCIABLE (US08 / Ley N.° 29733):
 * si consentimientoLey29733 no es true, se rechaza el registro.
 * Esto replica en backend el bloqueo del botón "Guardar" del prototipo.
 */
async function crear(req, res, next) {
  try {
    const {
      nombreCompleto,
      telefono,
      canalOrigen,
      productoFavorito,
      restriccionesAlergias,
      consentimientoLey29733,
    } = req.body;

    if (!nombreCompleto || !telefono || !canalOrigen) {
      return res.status(400).json({
        error: 'nombreCompleto, telefono y canalOrigen son obligatorios.',
      });
    }

    if (consentimientoLey29733 !== true) {
      return res.status(400).json({
        error:
          'No se puede registrar al cliente sin su consentimiento explícito (Ley N.° 29733, art. 13°).',
      });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto,
        telefono,
        canalOrigen,
        productoFavorito: productoFavorito || null,
        restriccionesAlergias: restriccionesAlergias || null,
        consentimientoLey29733: true,
        fechaConsentimiento: new Date(),
      },
    });

    return res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/clientes/:id
 * Pantalla 2 — Tarjeta de cliente + historial cronológico + métricas rápidas.
 * Calcula en vivo: frecuencia_visita, ticket_promedio_soles y churn_label,
 * los tres campos que alimentan directamente el dataset de APF3.
 */
async function obtenerDetalle(req, res, next) {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        interacciones: {
          orderBy: { fecha: 'desc' },
          include: { colaborador: { select: { nombre: true } } },
        },
      },
    });

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const interaccionesResueltas = cliente.interacciones.filter(
      (i) => i.montoSoles !== null
    );
    const totalVisitas = cliente.interacciones.length;
    const totalGastado = interaccionesResueltas.reduce(
      (acc, i) => acc + Number(i.montoSoles),
      0
    );
    const ticketPromedioSoles =
      interaccionesResueltas.length > 0
        ? Number((totalGastado / interaccionesResueltas.length).toFixed(2))
        : 0;

    const fechaUltima = cliente.interacciones[0]?.fecha || null;
    const churnLabel = calcularChurnLabel(
      fechaUltima,
      Number(process.env.CHURN_INACTIVITY_DAYS || 30)
    );

    return res.json({
      ...cliente,
      metricas: {
        frecuenciaVisita: totalVisitas,
        ticketPromedioSoles,
        churnLabel,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/clientes/:id
 * Actualiza datos del cliente (ej. corregir alergias, producto favorito manual).
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { productoFavorito, restriccionesAlergias } = req.body;

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...(productoFavorito !== undefined && { productoFavorito }),
        ...(restriccionesAlergias !== undefined && { restriccionesAlergias }),
      },
    });

    return res.json(cliente);
  } catch (err) {
    next(err);
  }
}

module.exports = { buscar, crear, obtenerDetalle, actualizar };
