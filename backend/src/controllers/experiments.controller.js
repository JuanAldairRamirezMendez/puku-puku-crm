const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const [runs, total] = await Promise.all([
      prisma.experimentRun.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.experimentRun.count(),
    ]);
    res.json({ data: runs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const run = await prisma.experimentRun.findUnique({ where: { id: req.params.id } });
    if (!run) return res.status(404).json({ error: 'Experiment run no encontrado' });
    res.json(run);
  } catch (err) {
    next(err);
  }
}

async function comparativa(req, res, next) {
  try {
    const runs = await prisma.experimentRun.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const chartData = runs.map((r) => ({
      id: r.id.slice(0, 8),
      fecha: r.createdAt.toISOString().slice(0, 10),
      modelo: r.bestModel,
      accuracy: r.accuracy,
      precision: r.precision,
      recall: r.recall,
      f1: r.f1,
      rocAuc: r.rocAuc,
    }));
    res.json(chartData);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, comparativa };
