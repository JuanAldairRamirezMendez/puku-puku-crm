/**
 * Seed: Lee dataset-apf3.csv y crea los registros en BD (bulk insert).
 *
 * Uso:  node prisma/seed-from-csv.js
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const COLLAB_NAMES = ['Carlos M.', 'Lucía G.', 'Miguel R.', 'Valeria S.', 'Diego H.', 'Sofía P.', 'Renato Q.'];
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
const SATISFACCIONES = ['SATISFECHO', 'NEUTRO', 'INSATISFECHO'];
const OBSERVACIONES = [null, null, null, 'Sin novedades.', 'Cliente satisfecho.', 'Prefiere mesa cerca ventana.', 'Muy amable, todo en orden.'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomDaysAgo(min, max) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * (max - min + 1)) - min);
  d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function leerCsv(ruta) {
  const raw = fs.readFileSync(ruta, 'utf-8').trim();
  const lineas = raw.split('\n').slice(1).filter(Boolean);
  return lineas.map((l) => {
    const v = l.split(',');
    return {
      nombre: v[0],
      frecuencia_visita: Number(v[1]),
      ticket_promedio_soles: Number(v[2]),
      canal_origen: v[3],
      producto_favorito: v[4],
      churn_label: Number(v[5]),
      churn_score: Number(v[6]),
    };
  });
}

async function main() {
  const csvPath = path.join(__dirname, 'dataset-apf3.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: No se encuentra ${csvPath}\nEjecuta primero: node apf3/generar_dataset_csv.js`);
    process.exit(1);
  }

  const filas = leerCsv(csvPath);
  console.log(`\n=== Seed desde CSV ===`);
  console.log(`Filas: ${filas.length} | Churn=1: ${filas.filter((f) => f.churn_label === 1).length}`);

  // 1. Usuarios
  const passwordHash = await bcrypt.hash('puku2026', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@pukupuku.pe' }, update: {},
    create: { nombre: 'María Flores López', email: 'admin@pukupuku.pe', passwordHash, rol: 'ADMINISTRADOR' },
  });
  const colIds = [];
  for (const nombre of COLLAB_NAMES) {
    const email = `${nombre.toLowerCase().replace(/[. ]/g, '').slice(0, 10)}@pukupuku.pe`;
    const col = await prisma.usuario.upsert({
      where: { email }, update: {},
      create: { nombre, email, passwordHash, rol: 'COLABORADOR' },
    });
    colIds.push(col.id);
  }
  console.log(`  Usuarios: 1 admin + ${colIds.length} colaboradores`);

  // 2. Limpiar datos previos
  await prisma.interaccion.deleteMany({});
  await prisma.cliente.deleteMany({});
  console.log('  Datos previos eliminados.');

  // 3. Crear clientes en bulk
  const clientesData = filas.map((f, i) => ({
    nombreCompleto: f.nombre,
    telefono: `+519${String(9000000 + i).slice(0, 8)}`,
    canalOrigen: f.canal_origen,
    productoFavorito: f.producto_favorito,
    consentimientoLey29733: true,
    fechaConsentimiento: randomDaysAgo(60, 200),
  }));

  // Batch de 50
  for (let i = 0; i < clientesData.length; i += 50) {
    await prisma.cliente.createMany({
      data: clientesData.slice(i, i + 50),
    });
  }
  console.log(`  ${clientesData.length} clientes creados.`);

  // 4. Obtener IDs de clientes recién creados
  const clientes = await prisma.cliente.findMany({ orderBy: { id: 'asc' } });

  // 5. Crear interacciones en bulk
  let totalInteracciones = 0;
  for (let idx = 0; idx < filas.length; idx++) {
    const fila = filas[idx];
    const clienteId = clientes[idx].id;
    const n = fila.frecuencia_visita;
    if (n === 0) continue;

    const esChurn = fila.churn_label === 1;
    const interacciones = [];

    for (let j = 0; j < n; j++) {
      const esUltima = j === n - 1;
      const daysAgo = esUltima
        ? (esChurn ? 31 + Math.floor(Math.random() * 60) : Math.floor(Math.random() * 28))
        : Math.floor(Math.random() * 90) + (esChurn ? 35 : 5);

      const monto = Math.max(4, Math.round(
        (fila.ticket_promedio_soles + (Math.random() - 0.5) * fila.ticket_promedio_soles * 0.6) * 100
      ) / 100);
      const fecha = randomDaysAgo(daysAgo, daysAgo + 3);

      interacciones.push({
        clienteId,
        canal: fila.canal_origen,
        resumenPedido: randomItem(PEDIDOS),
        montoSoles: monto,
        colaboradorId: randomItem(colIds),
        estado: 'RESUELTO',
        satisfaccion: randomItem(SATISFACCIONES),
        actualizoPreferencia: Math.random() < 0.10,
        observacion: randomItem(OBSERVACIONES),
        fecha,
        cerradaEn: fecha,
      });
    }

    // Batch insert de interacciones
    for (let i = 0; i < interacciones.length; i += 100) {
      await prisma.interaccion.createMany({
        data: interacciones.slice(i, i + 100),
      });
    }
    totalInteracciones += interacciones.length;

    if ((idx + 1) % 50 === 0) console.log(`  ${idx + 1}/${filas.length} clientes procesados...`);
  }

  // 6. Estadísticas
  console.log(`\n=== Seed desde CSV completado ===`);
  console.log(`  Clientes:        ${clientes.length}`);
  console.log(`  Interacciones:   ${totalInteracciones}`);
  console.log(`  Promedio x cli:  ${(totalInteracciones / clientes.length).toFixed(1)}`);

  // Verificar churn real
  const dataExport = await prisma.cliente.findMany({
    include: { interacciones: { orderBy: { fecha: 'desc' } } },
  });
  const conChurn = dataExport.filter((c) => {
    if (c.interacciones.length === 0) return true;
    const diffMs = Date.now() - new Date(c.interacciones[0].fecha).getTime();
    return diffMs / (1000 * 60 * 60 * 24) > 30;
  }).length;
  console.log(`  Churn label=1:   ${conChurn} (${((conChurn / clientes.length) * 100).toFixed(0)}%)`);
  console.log(`  \`Dataset listo en GET /api/reportes/export-apf3.csv\``);
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
