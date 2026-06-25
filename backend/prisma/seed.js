/**
 * Seed inicial: crea un usuario administrador y un colaborador de prueba,
 * y dos clientes de ejemplo con interacciones, para poder probar el flujo
 * completo de las 3 pantallas sin esperar datos reales del local.
 *
 * Ejecutar con: npm run seed
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('puku2026', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@pukupuku.pe' },
    update: {},
    create: {
      nombre: 'María Flores López',
      email: 'admin@pukupuku.pe',
      passwordHash,
      rol: 'ADMINISTRADOR',
    },
  });

  const colaborador = await prisma.usuario.upsert({
    where: { email: 'carla@pukupuku.pe' },
    update: {},
    create: {
      nombre: 'Carla M.',
      email: 'carla@pukupuku.pe',
      passwordHash,
      rol: 'COLABORADOR',
    },
  });

  const ana = await prisma.cliente.upsert({
    where: { telefono: '+51987654321' },
    update: {},
    create: {
      nombreCompleto: 'Ana Torres',
      telefono: '+51987654321',
      canalOrigen: 'INSTAGRAM',
      productoFavorito: 'Flat white sin azúcar',
      restriccionesAlergias: 'Intolerante a la lactosa',
      consentimientoLey29733: true,
      fechaConsentimiento: new Date(),
    },
  });

  await prisma.interaccion.createMany({
    data: [
      {
        clienteId: ana.id,
        canal: 'PRESENCIAL',
        resumenPedido: 'Flat white S/14 + Croissant de jamón S/12',
        montoSoles: 26,
        colaboradorId: colaborador.id,
        estado: 'RESUELTO',
        satisfaccion: 'SATISFECHO',
        cerradaEn: new Date(),
      },
      {
        clienteId: ana.id,
        canal: 'INSTAGRAM',
        resumenPedido: 'Desayuno completo S/35 + Jugo de naranja S/8',
        montoSoles: 43,
        colaboradorId: colaborador.id,
        estado: 'EN_SEGUIMIENTO',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed completado.');
  console.log(`   Admin: admin@pukupuku.pe / puku2026`);
  console.log(`   Colaborador: carla@pukupuku.pe / puku2026`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
