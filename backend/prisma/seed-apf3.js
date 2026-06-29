const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];
const PRODUCTOS = [
  'Flat white sin azúcar', 'Cappuccino clásico', 'Latte caramel',
  'Matcha latte', 'Americano', 'Mocha', 'Chai latte', 'Café con leche',
  'Espresso doble', 'Frappé de vainilla', 'Smoothie de maracuyá',
  'Chocolate caliente', 'Té chai', 'Jugo de naranja natural', 'Alfajor de lucma',
];
const PEDIDOS = [
  'Flat white S/14 + Croissant de jamón S/12',
  'Cappuccino S/12 + Brownie S/9',
  'Latte caramel S/15 + Sandwich vegetal S/16',
  'Matcha latte S/16 + Alfajor S/5',
  'Americano S/10 + Tostada palta S/11',
  'Mocha S/15 + Porción torta tres leches S/13',
  'Chai latte S/14 + Empanada pollo S/10',
  'Café con leche S/11 + Sánguche mixto S/15',
  'Espresso doble S/8 + Alfajor S/5',
  'Frappé vainilla S/17 + Pie de limón S/12',
  'Smoothie maracuyá S/16 + Wrap vegetal S/14',
  'Chocolate caliente S/14 + Galleta artesanal S/6',
  'Té chai S/13 + Muffin arándano S/8',
  'Jugo naranja S/10 + Bowl quinoa S/18',
  'Flat white grande S/16 + Tostada palta S/12',
  'Latte caramel S/15 + Alfajor S/5',
  'Cappuccino S/12 + Porción cheesecake S/14',
  'Mocha S/15 + Sandwich pollo S/16',
  'Americano S/10 + Galleta avena S/6',
  'Frappé mocha S/18 + Pie de manzana S/11',
];
const NOMBRES = [
  'Ana Torres', 'Carlos Ruiz', 'Lucía Mendoza', 'Miguel Ángel Paredes',
  'Sofía Castillo', 'Diego Ramos', 'Valeria Gutiérrez', 'Felipe Quispe',
  'Camila Huamán', 'Jorge Lozano', 'María Fernanda Ríos', 'Pedro Sánchez',
  'Ximena Vásquez', 'Andrés García', 'Gabriela Puma', 'Luis Fernando Tapia',
  'Carolina Salazar', 'Renato Vargas', 'Bianca Guerrero', 'Sebastián Roca',
  'Alejandra Rivas', 'Franco Cárdenas', 'Daniela Chirinos', 'Eduardo Navarro',
  'Paola Zegarra', 'Fernando Calderón', 'Andrea Benavides', 'Rodrigo Molina',
  'Claudia Palacios', 'Emilio Herrera', 'Lorena Ccora', 'Hugo Martínez',
  'Rosa Huamán', 'Iván Pacheco', 'Mónica Salas', 'Javier Cuba',
  'Angélica Condori', 'Oscar Zamora', 'Patricia Llanos', 'Marco Alarcón',
  'Katherine Paredes', 'Gonzalo Quiroz', 'Natalia Flores', 'Cristian Velarde',
  'Diana Carpio', 'Víctor Huerta', 'Milagros Álvarez', 'Alan Pozo',
  'Stephanie Bellido', 'Bryan Ccoyllo',
];
const RESTRICCIONES = [
  null, 'Intolerante a la lactosa', 'Alérgico al maní',
  'Diabetes - sin azúcar', 'Celíaco - sin gluten',
  null, null, null, null, null,
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomDaysAgo(min, max) {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(min, max));
  d.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0);
  return d;
}

async function main() {
  console.log('=== Seed APF3 - Dataset Simulado ===');
  const passwordHash = await bcrypt.hash('puku2026', 10);
  const COLLAB_NAMES = ['Carlos M.', 'Lucía G.', 'Miguel R.', 'Valeria S.', 'Diego H.', 'Sofía P.', 'Renato Q.'];

  // Crear usuarios
  await prisma.usuario.upsert({
    where: { email: 'admin@pukupuku.pe' }, update: {},
    create: { nombre: 'María Flores López', email: 'admin@pukupuku.pe', passwordHash, rol: 'ADMINISTRADOR' },
  });

  const colaboradores = [];
  for (const nombre of COLLAB_NAMES) {
    const email = `${nombre.toLowerCase().replace(/[. ]/g, '').slice(0, 10)}@pukupuku.pe`;
    const col = await prisma.usuario.upsert({
      where: { email }, update: {},
      create: { nombre, email, passwordHash, rol: 'COLABORADOR' },
    });
    colaboradores.push(col);
  }
  console.log(`  Usuarios: 1 admin + ${colaboradores.length} colaboradores`);

  // Crear 150+ clientes con interacciones
  const TOTAL_CLIENTES = 150;
  let createdCount = 0;

  for (let i = 0; i < TOTAL_CLIENTES; i++) {
    const nombre = NOMBRES[i % NOMBRES.length];
    const sufijo = i < NOMBRES.length ? '' : ` ${String.fromCharCode(65 + Math.floor(i / NOMBRES.length))}`;
    const telefono = `+519${String(10000000 + i).slice(0, 8)}`;

    const productoFavorito = randomItem(PRODUCTOS);
    const canalOrigen = randomItem(CANALES);

    // Eliminar interacciones previas para limpieza en re-ejecución
    const clienteExistente = await prisma.cliente.findUnique({ where: { telefono } });
    if (clienteExistente) {
      await prisma.interaccion.deleteMany({ where: { clienteId: clienteExistente.id } });
    }

    const cliente = await prisma.cliente.upsert({
      where: { telefono },
      update: { canalOrigen, productoFavorito },
      create: {
        nombreCompleto: `${nombre}${sufijo}`,
        telefono,
        canalOrigen,
        productoFavorito,
        restriccionesAlergias: randomItem(RESTRICCIONES),
        consentimientoLey29733: true,
        fechaConsentimiento: randomDaysAgo(30, 180),
      },
    });

    // Distribución de interacciones:
    //   5%  → 0 interacciones (churn=1 automático)
    //   15% → 1-2 interacciones
    //   80% → 3-12 interacciones
    const numInteracciones = Math.random() < 0.05 ? 0
      : Math.random() < 0.15 ? randomInt(1, 2)
      : randomInt(3, 12);

    interfaceLoop:
    for (let j = 0; j < numInteracciones; j++) {
      // Última interacción: 20% antigua (>30 días, churn), 80% reciente (≤30 días, activo)
      const esUltima = j === numInteracciones - 1;
      const esChurn = esUltima && numInteracciones > 0 && Math.random() < 0.20;
      const daysAgo = esChurn ? randomInt(31, 90) : randomInt(0, 30);

      const satisfaccionRoll = Math.random();
      const satisfaccion = satisfaccionRoll < 0.10 ? 'INSATISFECHO'
        : satisfaccionRoll < 0.35 ? 'NEUTRO'
        : 'SATISFECHO';

      const estadoRoll = Math.random();
      const estado = esUltima && estadoRoll < 0.12 ? 'PENDIENTE'
        : estadoRoll < 0.30 ? 'EN_SEGUIMIENTO'
        : 'RESUELTO';

      if (esUltima && estado === 'PENDIENTE') {
        await prisma.interaccion.create({
          data: {
            clienteId: cliente.id,
            canal: randomItem(CANALES),
            resumenPedido: randomItem(PEDIDOS),
            montoSoles: randomInt(8, 45),
            colaboradorId: randomItem(colaboradores).id,
            estado,
            satisfaccion: null,
            actualizoPreferencia: false,
            observacion: null,
            fecha: randomDaysAgo(0, 7),
            cerradaEn: null,
          },
        });
      } else {
        const fecha = randomDaysAgo(daysAgo, daysAgo + 2);
        await prisma.interaccion.create({
          data: {
            clienteId: cliente.id,
            canal: randomItem(CANALES),
            resumenPedido: randomItem(PEDIDOS),
            montoSoles: randomInt(8, 45),
            colaboradorId: randomItem(colaboradores).id,
            estado: 'RESUELTO',
            satisfaccion,
            actualizoPreferencia: Math.random() < 0.15,
            observacion: Math.random() < 0.35 ? randomItem([
              'Sin novedades.', 'Cliente satisfecho.', 'Prefiere mesa cerca ventana.',
              'Solicitó más información sobre el programa de fidelidad.',
              'Muy amable, todo en orden.', null, null,
            ]) : null,
            fecha,
            cerradaEn: fecha,
          },
        });
      }
    }

    createdCount++;
    if (createdCount % 25 === 0) console.log(`  ${createdCount}/${TOTAL_CLIENTES} clientes...`);
  }

  // Estadísticas finales
  const totalClientes = await prisma.cliente.count();
  const totalInteracciones = await prisma.interaccion.count();
  const dataExport = await prisma.cliente.findMany({
    include: { interacciones: { orderBy: { fecha: 'desc' } } },
  });
  const conChurn = dataExport.filter((c) => {
    if (c.interacciones.length === 0) return true;
    const diffMs = Date.now() - new Date(c.interacciones[0].fecha).getTime();
    return diffMs / (1000 * 60 * 60 * 24) > 30;
  }).length;

  console.log(`\n=== Seed APF3 completado ===`);
  console.log(`  Clientes:        ${totalClientes}`);
  console.log(`  Interacciones:   ${totalInteracciones}`);
  console.log(`  Promedio x cli:  ${(totalInteracciones / totalClientes).toFixed(1)}`);
  console.log(`  Churn label=1:   ${conChurn} (${((conChurn / totalClientes) * 100).toFixed(0)}%)`);
  console.log(`\n  Dataset listo en GET /api/reportes/export-apf3.csv`);
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
