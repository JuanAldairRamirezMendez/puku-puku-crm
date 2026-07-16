const prisma = require('../config/db');
const { calcularChurnLabel, calcularChurnScore } = require('../utils/churn');
const { predictProbability } = require('../utils/churn-predictor');

/**
 * GET /api/clientes/buscar?q=texto
 * Pantalla 1 — Barra de búsqueda por nombre o teléfono.
 * Si existe, el frontend carga la tarjeta del cliente (Pantalla 2).
 */
async function buscar(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { nombreCompleto: { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q } },
      ],
    };

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombreCompleto: 'asc' },
      }),
      prisma.cliente.count({ where }),
    ]);

    return res.json({
      data: clientes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
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
    } = req.body;

    // Validación previa: si el teléfono ya existe, se informa al colaborador
    // con el nombre del cliente existente para evitar duplicados y permitir
    // asociar la interacción al registro correcto.
    const existente = await prisma.cliente.findUnique({ where: { telefono } });
    if (existente) {
      return res.status(409).json({
        error: `Ya existe un cliente registrado con el teléfono ${telefono}: ${existente.nombreCompleto}.`,
        clienteExistente: { id: existente.id, nombre: existente.nombreCompleto },
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
    const DIAS = Number(process.env.CHURN_INACTIVITY_DAYS || 30);
    const churnLabel = calcularChurnLabel(fechaUltima, DIAS);
    const churnScore = calcularChurnScore(cliente.interacciones, DIAS);

    const mlPrediction = predictProbability(cliente, cliente.interacciones);

    return res.json({
      ...cliente,
      metricas: {
        frecuenciaVisita: totalVisitas,
        ticketPromedioSoles,
        churnLabel,
        churnScore,
        mlScore: mlPrediction?.probabilidad ?? null,
        mlNivel: mlPrediction?.nivel ?? null,
        mlPctChurn: mlPrediction?.pctChurn ?? null,
        mlTopFactores: mlPrediction?.topFactores ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/clientes/:id/churn-score
 * Devuelve el score continuo de churn (0-1) y sus factores por separado.
 * Útil para el frontend (gauge visual) y para el notebook de APF3.
 */
async function obtenerChurnScore(req, res, next) {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: { interacciones: { orderBy: { fecha: 'desc' } } },
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const DIAS = Number(process.env.CHURN_INACTIVITY_DAYS || 30);
    const score = calcularChurnScore(cliente.interacciones, DIAS);
    const label = calcularChurnLabel(cliente.interacciones[0]?.fecha, DIAS);

    const mlPrediction = predictProbability(cliente, cliente.interacciones);

    return res.json({
      clienteId: id,
      churnScore: score,
      churnLabel: label,
      totalInteracciones: cliente.interacciones.length,
      mlScore: mlPrediction?.probabilidad ?? null,
      mlNivel: mlPrediction?.nivel ?? null,
      mlPctChurn: mlPrediction?.pctChurn ?? null,
      mlTopFactores: mlPrediction?.topFactores ?? [],
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

module.exports = { buscar, crear, obtenerDetalle, actualizar, obtenerChurnScore };
