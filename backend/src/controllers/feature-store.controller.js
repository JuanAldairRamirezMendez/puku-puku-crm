const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listarFeatures(req, res, next) {
  try {
    const features = await prisma.featureDefinition.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(features);
  } catch (err) {
    next(err);
  }
}

async function crearFeature(req, res, next) {
  try {
    const feature = await prisma.featureDefinition.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category || 'behavioral',
        dataType: req.body.dataType || 'numeric',
        source: req.body.source || 'manual',
      },
    });
    res.status(201).json(feature);
  } catch (err) {
    next(err);
  }
}

async function valoresCliente(req, res, next) {
  try {
    const valores = await prisma.featureValue.findMany({
      where: { clienteId: req.params.clienteId },
      include: { feature: { select: { name: true, category: true } } },
    });
    res.json(valores);
  } catch (err) {
    next(err);
  }
}

module.exports = { listarFeatures, crearFeature, valoresCliente };
