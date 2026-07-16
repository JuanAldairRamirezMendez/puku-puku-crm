const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res, next) {
  try {
    const tests = await prisma.experimentTest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          include: { _count: { select: { assignments: true } } },
        },
      },
    });
    res.json(tests);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const test = await prisma.experimentTest.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        targetMetric: req.body.targetMetric || 'roc_auc',
        createdBy: req.usuario?.id,
        variants: {
          create: (req.body.variants || []).map((v) => ({
            name: v.name,
            description: v.description,
            trafficPct: v.trafficPct || 50,
            config: v.config ? JSON.stringify(v.config) : null,
          })),
        },
      },
      include: { variants: true },
    });
    res.status(201).json(test);
  } catch (err) {
    next(err);
  }
}

async function iniciar(req, res, next) {
  try {
    const test = await prisma.experimentTest.update({
      where: { id: req.params.id },
      data: { status: 'running', startedAt: new Date() },
    });
    res.json(test);
  } catch (err) {
    next(err);
  }
}

async function completar(req, res, next) {
  try {
    const test = await prisma.experimentTest.update({
      where: { id: req.params.id },
      data: { status: 'completed', endedAt: new Date() },
      include: {
        variants: {
          include: { _count: { select: { assignments: true } } },
        },
      },
    });

    const results = test.variants.map((v) => ({
      variant: v.name,
      total: v._count.assignments,
    }));
    res.json({ ...test, results });
  } catch (err) {
    next(err);
  }
}

async function asignar(req, res, next) {
  try {
    const { variantId, clienteId } = req.body;
    const exists = await prisma.testAssign.findUnique({
      where: { variantId_clienteId: { variantId, clienteId } },
    });
    if (exists) return res.status(409).json({ error: 'Cliente ya asignado a esta variante' });

    const assign = await prisma.testAssign.create({
      data: { variantId, clienteId },
    });
    res.status(201).json(assign);
  } catch (err) {
    next(err);
  }
}

async function registrarConversion(req, res, next) {
  try {
    const assign = await prisma.testAssign.updateMany({
      where: { id: req.params.id, converted: null },
      data: { converted: true, convertedAt: new Date() },
    });
    if (assign.count === 0) return res.status(404).json({ error: 'Asignacion no encontrada o ya convertida' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, iniciar, completar, asignar, registrarConversion };
