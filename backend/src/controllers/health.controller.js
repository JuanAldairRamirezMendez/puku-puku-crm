const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();
const START_TIME = Date.now();

async function health(req, res) {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  res.json({
    status: 'ok',
    servicio: 'Puku Puku CRM API',
    uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
    uptimeSegundos: uptime,
    timestamp: new Date(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  });
}

async function healthDetailed(req, res, next) {
  const checks = {};

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', message: err.message };
  }

  // Uptime
  checks.uptime = Math.floor((Date.now() - START_TIME) / 1000);

  // Memory
  const mem = process.memoryUsage();
  checks.memoria = {
    rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
  };

  // Python/ML check
  try {
    execSync('python3 --version', { timeout: 3000, stdio: 'pipe' });
    checks.ml = { status: 'ok', runtime: 'python3' };
  } catch {
    try {
      execSync('python --version', { timeout: 3000, stdio: 'pipe' });
      checks.ml = { status: 'ok', runtime: 'python' };
    } catch {
      checks.ml = { status: 'no disponible', runtime: null };
    }
  }

  const allOk = checks.database.status === 'ok';
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degradado',
    servicio: 'Puku Puku CRM API',
    timestamp: new Date(),
    checks,
  });
}

module.exports = { health, healthDetailed };
