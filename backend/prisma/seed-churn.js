/**
 * Seed: 50 clientes peruanos con compras simuladas y analytics de churn.
 *
 * Lógica de churn (src/utils/churn.js):
 *   churn_label = 1 si última interacción fue hace >30 días (o no tiene)
 *   churn_score [0-1] = recency(50%) + frequency(20%) + monetary(15%) + satisfaction(15%)
 *
 * Uso: node prisma/seed-churn.js
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ── Datos ──
const NOMBRES = [
  'Ana Torres Quispe', 'Camila Reyes Ponce', 'Jorge Paredes Vidal',
  'Sofía Mendoza Ríos', 'Diego Huamán Castro', 'Valeria Salazar Nuñez',
  'Miguel Ríos Espinoza', 'Fernanda Cárdenas Luna', 'Renzo Aguirre Palacios',
  'Camila Suárez Bravo', 'Andrea Chávez Rojas', 'Sebastián Flores Meza',
  'Daniela Herrera Campos', 'Gonzalo Vega Marín', 'Lucía Zevallos Prado',
  'Mateo Ramírez Godoy', 'Ximena Cabrera Ortiz', 'Adrián Salinas Torres',
  'Paola Guerrero Díaz', 'Christian Loayza Núñez', 'Milagros Farfán Soto',
  'Rodrigo Benavides León', 'Carolina Espejo Ramos', 'Julio Chumpitaz Vera',
  'Alejandra Rosales Pinto', 'Bruno Aliaga Solano', 'Gabriela Del Solar Prieto',
  'Iván Contreras Muñoz', 'Rosa Cusihuamán Apaza', 'Franco Bustamante Silva',
  'Karina Villanueva Rojas', 'Esteban Quiroz Delgado', 'Natalia Segura Ibáñez',
  'Cristian Yupanqui Mamani', 'Melissa Pacheco Rivas', 'Álvaro Cornejo Tapia',
  'Verónica Alvarado Cruz', 'Martín Escalante Vílchez', 'Yolanda Ccama Huamaní',
  'Sergio Malpartida Osorio', 'Fiorella Neyra Guevara', 'Piero Gamboa Céspedes',
  'Ariana Del Águila Ríos', 'Manuel Coaquira Yauri', 'Tatiana Robles Amaya',
  'Álex Portugal Zúñiga', 'Cielo Mamani Quispe', 'Erick Vásquez Ordóñez',
  'Brenda Loyola Escobar', 'Diego Huancollo Fernández',
];

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
const SATISFACCION = ['SATISFECHO', 'NEUTRO', 'INSATISFECHO'];
const OBSERVACIONES = [null, null, null, 'Sin novedades.', 'Cliente satisfecho.', 'Prefiere mesa cerca ventana.', 'Muy amable, todo en orden.'];
const COLLAB_NAMES = ['Carlos M.', 'Lucía G.', 'Miguel R.', 'Valeria S.', 'Diego H.', 'Sofía P.', 'Renato Q.'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function round2(v) { return Math.round(v * 100) / 100; }

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0);
  return d;
}

// ── Churn Score (mismo algoritmo que backend) ──
function calcularChurnScore(interacciones) {
  if (!interacciones || interacciones.length === 0) return 0.92;
  const ahora = new Date();
  const ultimaFecha = new Date(interacciones[0].fecha);
  const diffDias = (ahora - ultimaFecha) / (1000 * 60 * 60 * 24);
  const recencyScore = 1 / (1 + Math.exp(-0.12 * (diffDias - 30)));
  const n = interacciones.length;
  const freqScore = Math.max(0, 1 - n / 20);
  const conMonto = interacciones.filter((i) => i.montoSoles !== null);
  const avgTicket = conMonto.length > 0
    ? conMonto.reduce((s, i) => s + Number(i.montoSoles), 0) / conMonto.length
    : 0;
  const monetaryScore = Math.max(0, 1 - avgTicket / 45);
  const recientes = interacciones.filter((i) => (ahora - new Date(i.fecha)) / (1000 * 60 * 60 * 24) <= 90);
  const insatisfechos = recientes.filter((i) => i.satisfaccion === 'INSATISFECHO').length;
  const satScore = recientes.length > 0 ? insatisfechos / recientes.length : 0;
  return round2(Math.min(1, Math.max(0, recencyScore * 0.50 + freqScore * 0.20 + monetaryScore * 0.15 + satScore * 0.15)));
}

// ── Main ──
async function main() {
  console.log('\n=== Seed Churn — 50 clientes peruanos ===\n');
  const passwordHash = await bcrypt.hash('puku2026', 10);

  // Usuarios
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

  // Limpiar datos previos
  await prisma.interaccion.deleteMany({});
  await prisma.cliente.deleteMany({});

  // Perfiles de clientes
  const perfiles = [
    { minFrec: 6, maxFrec: 14, minTicket: 20, maxTicket: 45, probChurn: 0.10 },
    { minFrec: 3, maxFrec: 6,  minTicket: 12, maxTicket: 30, probChurn: 0.20 },
    { minFrec: 1, maxFrec: 3,  minTicket: 8,  maxTicket: 22, probChurn: 0.40 },
    { minFrec: 0, maxFrec: 1,  minTicket: 6,  maxTicket: 15, probChurn: 0.75 },
  ];

  // Asignación: ~24% alta, ~36% media, ~24% baja, ~16% muy baja
  const asignacion = [
    ...Array(12).fill(0), ...Array(18).fill(1),
    ...Array(12).fill(2), ...Array(8).fill(3),
  ];

  const clientsData = NOMBRES.map((nombre, i) => {
    const perfil = perfiles[asignacion[i]];
    const frec = randomInt(perfil.minFrec, perfil.maxFrec);
    return {
      nombre,
      frec,
      esChurn: frec === 0 || Math.random() < perfil.probChurn,
      canal: randomItem(CANALES),
      producto: randomItem(PRODUCTOS),
      minTicket: perfil.minTicket,
      maxTicket: perfil.maxTicket,
    };
  });

  // Crear clientes
  for (const c of clientsData) {
    await prisma.cliente.create({
      data: {
        nombreCompleto: c.nombre,
        telefono: `+519${String(9000000 + clientsData.indexOf(c)).slice(0, 8)}`,
        canalOrigen: c.canal,
        productoFavorito: c.producto,
        consentimientoLey29733: true,
        fechaConsentimiento: dateDaysAgo(randomInt(60, 200)),
      },
    });
  }
  console.log(`  ${clientsData.length} clientes creados.`);

  // Obtener IDs reales
  const dbClients = await prisma.cliente.findMany({ orderBy: { id: 'asc' } });

  // Crear interacciones
  let totalInts = 0;
  for (let idx = 0; idx < dbClients.length; idx++) {
    const cliente = dbClients[idx];
    const data = clientsData[idx];
    const n = data.frec;
    if (n === 0) continue;

    const interacciones = [];
    for (let j = 0; j < n; j++) {
      const esUltima = j === n - 1;
      const ultimaDaysAgo = data.esChurn ? randomInt(31, 90) : randomInt(0, 28);
      const daysAgo = esUltima ? ultimaDaysAgo : ultimaDaysAgo + randomInt(1, 25) * (j + 1);
      const monto = round2(data.minTicket + Math.random() * (data.maxTicket - data.minTicket));

      interacciones.push({
        clienteId: cliente.id,
        canal: randomItem(CANALES),
        resumenPedido: randomItem(PEDIDOS),
        montoSoles: monto,
        colaboradorId: randomItem(colIds),
        estado: 'RESUELTO',
        satisfaccion: randomItem(SATISFACCION),
        actualizoPreferencia: Math.random() < 0.12,
        observacion: randomItem(OBSERVACIONES),
        fecha: dateDaysAgo(daysAgo),
        cerradaEn: dateDaysAgo(daysAgo),
      });
    }

    for (let i = 0; i < interacciones.length; i += 100) {
      await prisma.interaccion.createMany({ data: interacciones.slice(i, i + 100) });
    }
    totalInts += interacciones.length;
  }
  console.log(`  ${totalInts} interacciones creadas.\n`);

  // ── Analytics de Churn ──
  console.log('=== ANALYTICS DE CHURN ===\n');

  const clientes = await prisma.cliente.findMany({
    include: { interacciones: { orderBy: { fecha: 'desc' } } },
  });

  let totalChurn = 0;
  let sumaScore = 0;
  const porCanal = {};
  const churnPorCanal = {};
  const frecuencias = { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '10+': 0 };
  const churnPorPerfil = {};

  for (const c of clientes) {
    const ints = c.interacciones;
    const n = ints.length;
    const ultima = ints[0]?.fecha;
    const diffDias = ultima ? (Date.now() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24) : 999;
    const churnLabel = !ultima || diffDias > 30 ? 1 : 0;
    const score = calcularChurnScore(ints);

    if (churnLabel === 1) totalChurn++;
    sumaScore += score;

    const canal = c.canalOrigen;
    porCanal[canal] = (porCanal[canal] || 0) + 1;
    if (churnLabel === 1) churnPorCanal[canal] = (churnPorCanal[canal] || 0) + 1;

    if (n === 0) frecuencias['0']++;
    else if (n <= 2) frecuencias['1-2']++;
    else if (n <= 5) frecuencias['3-5']++;
    else if (n <= 10) frecuencias['6-10']++;
    else frecuencias['10+']++;

    const perfilKey = n >= 6 ? 'Alta frecuencia' : n >= 3 ? 'Regular' : n >= 1 ? 'Baja frecuencia' : 'Inactivo';
    if (!churnPorPerfil[perfilKey]) churnPorPerfil[perfilKey] = { total: 0, churn: 0 };
    churnPorPerfil[perfilKey].total++;
    if (churnLabel === 1) churnPorPerfil[perfilKey].churn++;
  }

  const pctChurn = ((totalChurn / clientes.length) * 100).toFixed(1);
  console.log(`  Churn rate general:     ${totalChurn}/${clientes.length} = ${pctChurn}%`);
  console.log(`  Churn score promedio:   ${(sumaScore / clientes.length).toFixed(4)}\n`);

  console.log('  Churn por canal:');
  for (const [canal, total] of Object.entries(porCanal).sort()) {
    const ch = churnPorCanal[canal] || 0;
    console.log(`    ${canal.padEnd(12)} ${ch}/${total} = ${((ch / total) * 100).toFixed(1)}% churn`);
  }

  console.log('\n  Churn por perfil de visita:');
  for (const [perfil, data] of Object.entries(churnPorPerfil)) {
    const pct = ((data.churn / data.total) * 100).toFixed(1);
    console.log(`    ${perfil.padEnd(22)} ${data.churn}/${data.total} = ${pct}% churn`);
  }

  console.log('\n  Distribución de frecuencias de visita:');
  for (const [rango, count] of Object.entries(frecuencias)) {
    if (count > 0) console.log(`    ${rango.padEnd(6)} ${count} clientes (${((count / clientes.length) * 100).toFixed(0)}%)`);
  }

  console.log('\n  Top 5 clientes con mayor riesgo de churn:');
  const topChurn = clientes.map((c) => ({
    nombre: c.nombreCompleto,
    score: calcularChurnScore(c.interacciones),
    ultimaCompra: c.interacciones[0]?.fecha,
    visitas: c.interacciones.length,
  })).sort((a, b) => b.score - a.score).slice(0, 5);
  for (const c of topChurn) {
    const diff = c.ultimaCompra ? Math.floor((Date.now() - new Date(c.ultimaCompra).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A';
    console.log(`    ${c.nombre.padEnd(30)} score: ${c.score.toFixed(4)}  | ${c.visitas} visitas | última hace ${diff} días`);
  }

  console.log(`\n=== Seed completado. Endpoint: GET /api/reportes/analytics ===`);
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
