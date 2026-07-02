/**
 * Genera dataset_apf3.csv completo con 150+ filas a partir del ejemplo de Ana Torres.
 * Ejecutar: node apf3/generar_dataset_csv.js
 * Output:   backend/prisma/dataset-apf3.csv
 */
const fs = require('fs');
const path = require('path');

const RANDOM_SEED = 42;
let _seed = RANDOM_SEED;
function rng() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed - 1) / 2147483646; }
function randomInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function randomItem(arr) { return arr[Math.floor(rng() * arr.length)]; }
function round2(v) { return Number(v.toFixed(2)); }

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];
const PRODUCTOS = [
  'Flat white sin azúcar', 'Cappuccino clásico', 'Latte caramel',
  'Matcha latte', 'Americano', 'Mocha', 'Chai latte', 'Café con leche',
  'Espresso doble', 'Frappé de vainilla', 'Smoothie de maracuyá',
  'Chocolate caliente', 'Té chai', 'Jugo de naranja natural', 'Alfajor de lucma',
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
  'María José Cuéllar', 'Raúl Mendoza', 'Fiorella Carpio', 'Aldo Paredes',
  'Cynthia Gálvez', 'Roberto Sosa', 'Pamela Ríos', 'Jesús Huarcaya',
  'Melissa Ccora', 'Martín Zevallos',
];

function calcularChurnScore(frecuencia, ticketPromedio) {
  // Simula el mismo cálculo del backend: sigmoid con recencia + frecuencia + ticket
  const score = 1 / (1 + Math.exp(-0.5 * (2 - frecuencia * 0.3 - ticketPromedio * 0.01)));
  return round2(Math.min(1, Math.max(0, score)));
}

function generarDataset(total = 160) {
  const filas = [];

  // Fila 1: Ana Torres exacta del ejemplo real
  filas.push({
    nombre: 'Ana Torres',
    frecuencia_visita: 5,
    ticket_promedio_soles: 34.5,
    canal_origen: 'INSTAGRAM',
    producto_favorito: 'Flat white sin azúcar',
    churn_label: 0,
    churn_score: 0.1983,
  });

  // Generar filas 2..total
  for (let i = 1; i < total; i++) {
    const nombre = NOMBRES[i % NOMBRES.length];
    const sufijo = i < NOMBRES.length ? '' : ` ${Math.floor(i / NOMBRES.length)}`;
    const frec = rng() < 0.05 ? 0 : rng() < 0.15 ? randomInt(1, 2) : randomInt(3, 14);

    // Distribución de montos por cliente
    const montos = Array.from({ length: Math.max(1, frec) }, () => randomInt(6, 48));
    const ticketProm = round2(montos.reduce((a, b) => a + b, 0) / montos.length);

    // Churn: lógico basado en última visita
    const esChurn = frec === 0 || (frec > 0 && rng() < 0.22);

    filas.push({
      nombre: `${nombre}${sufijo}`,
      frecuencia_visita: frec,
      ticket_promedio_soles: ticketProm,
      canal_origen: randomItem(CANALES),
      producto_favorito: randomItem(PRODUCTOS),
      churn_label: esChurn ? 1 : 0,
      churn_score: calcularChurnScore(frec, ticketProm),
    });
  }

  return filas;
}

function toCsv(filas) {
  const header = 'nombre,frecuencia_visita,ticket_promedio_soles,canal_origen,producto_favorito,churn_label,churn_score';
  const body = filas.map((f) =>
    `${f.nombre},${f.frecuencia_visita},${f.ticket_promedio_soles},${f.canal_origen},${f.producto_favorito},${f.churn_label},${f.churn_score}`
  );
  return header + '\n' + body.join('\n') + '\n';
}

// --- Main ---
const filas = generarDataset(160);
const csv = toCsv(filas);

const outDir = path.join(__dirname, '..', 'backend', 'prisma');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'dataset-apf3.csv');
fs.writeFileSync(outPath, csv, 'utf-8');

const churnCount = filas.filter((f) => f.churn_label === 1).length;
console.log(`Dataset generado: ${filas.length} filas`);
console.log(`  Churn label=1:  ${churnCount} (${((churnCount / filas.length) * 100).toFixed(0)}%)`);
console.log(`  Churn label=0:  ${filas.length - churnCount}`);
console.log(`  Churn score promedio: ${(filas.reduce((s, f) => s + f.churn_score, 0) / filas.length).toFixed(4)}`);
console.log(`Guardado en: ${outPath}`);
