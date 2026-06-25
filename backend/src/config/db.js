const { PrismaClient } = require('@prisma/client');

// Instancia única de Prisma reutilizada en toda la app (evita
// agotar conexiones de PostgreSQL en desarrollo con nodemon).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
