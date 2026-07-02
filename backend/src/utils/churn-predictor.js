const fs = require('fs');
const path = require('path');

let model = null;
let scaler = null;

function loadModel() {
  if (model && scaler) return;
  const modelPath = path.join(__dirname, '../../ml/output/model.json');
  const scalerPath = path.join(__dirname, '../../ml/output/scaler.json');
  try {
    model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    scaler = JSON.parse(fs.readFileSync(scalerPath, 'utf8'));
  } catch (e) {
    console.error('Failed to load ML model:', e.message);
  }
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function predictTree(tree, features) {
  let node = 0;
  while (tree.children_left[node] !== -1) {
    const feat = tree.feature[node];
    if (features[feat] <= tree.threshold[node]) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }
  return tree.value[node][0];
}

function standardize(features) {
  const std = [];
  for (let i = 0; i < features.length; i++) {
    std.push((features[i] - scaler.mean[i]) / scaler.scale[i]);
  }
  return std;
}

function predictRaw(features) {
  const scaled = standardize(features);
  let raw = model.init_value;
  for (const tree of model.trees) {
    raw += model.learning_rate * predictTree(tree, scaled);
  }
  return raw;
}

function predictProbability(cliente, interacciones) {
  loadModel();
  if (!model || !scaler) return null;

  const ahora = new Date();
  const n = interacciones.length;

  if (n === 0) {
    return { probabilidad: 0.92, nivel: 'alto', explicacion: 'Sin interacciones registradas' };
  }

  const sorted = [...interacciones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const fechas = sorted.map(i => new Date(i.fecha));
  const montos = sorted.map(i => Number(i.montoSoles) || 0);
  const canales = sorted.map(i => i.canal);
  const satisfacciones = sorted.map(i => i.satisfaccion);

  const primeraFecha = fechas[0];
  const ultimaFecha = fechas[n - 1];
  const diasUltima = (ahora - ultimaFecha) / (1000 * 60 * 60 * 24);
  const tenure = Math.max(1, (ultimaFecha - primeraFecha) / (1000 * 60 * 60 * 24));

  // Gaps
  const gaps = [];
  for (let i = 1; i < n; i++) {
    gaps.push((fechas[i] - fechas[i - 1]) / (1000 * 60 * 60 * 24));
  }
  const gapMean = gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
  const gapStd = gaps.length > 1
    ? Math.sqrt(gaps.reduce((s, g) => s + (g - gapMean) ** 2, 0) / gaps.length)
    : 0;
  const gapMax = gaps.length ? Math.max(...gaps) : 0;

  // Recency
  const recency = Math.min(diasUltima, 365);

  // Frequency
  const freqTotal = n;
  const freqSemanal = n / Math.max(1, tenure / 7);
  const freqMensual = n / Math.max(1, tenure / 30);
  const interaccionesUltimoMes = fechas.filter(f => (ahora - f) / (1000 * 60 * 60 * 24) <= 30).length;
  const interaccionesUltimoTrim = fechas.filter(f => (ahora - f) / (1000 * 60 * 60 * 24) <= 90).length;

  // Monetary
  const ticketPromedio = montos.length ? montos.reduce((s, m) => s + m, 0) / montos.length : 0;
  const ticketTotal = montos.reduce((s, m) => s + m, 0);
  const ticketMax = montos.length ? Math.max(...montos) : 0;
  const ticketMin = montos.length ? Math.min(...montos) : 0;
  const ticketStd = montos.length > 1
    ? Math.sqrt(montos.reduce((s, m) => s + (m - ticketPromedio) ** 2, 0) / montos.length)
    : 0;
  const ticketUltimo = montos.length ? montos[montos.length - 1] : 0;
  const ultimoMesMontos = montos.filter((m, i) => (ahora - fechas[i]) / (1000 * 60 * 60 * 24) <= 30);
  const ticketUltimoMes = ultimoMesMontos.length
    ? ultimoMesMontos.reduce((s, m) => s + m, 0) / ultimoMesMontos.length
    : 0;

  // Ticket trend (slope of last 5 tickets)
  let ticketTrend = 0;
  const lastM = montos.slice(-5);
  if (lastM.length >= 2) {
    const xs = lastM.map((_, i) => i);
    const nPoints = lastM.length;
    const xMean = xs.reduce((s, x) => s + x, 0) / nPoints;
    const yMean = lastM.reduce((s, y) => s + y, 0) / nPoints;
    const num = xs.reduce((s, x, i) => s + (x - xMean) * (lastM[i] - yMean), 0);
    const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
    ticketTrend = den ? num / den : 0;
  }

  // Channel diversity
  const canalesUnicos = new Set(canales).size;
  const diversidadCanal = canalesUnicos / 5;
  const canalCounts = {};
  for (const c of canales) canalCounts[c] = (canalCounts[c] || 0) + 1;
  const canalMasUsado = Object.entries(canalCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Satisfaction features
  const nInsatisfecho = satisfacciones.filter(s => s === 'INSATISFECHO').length;
  const nSatisfecho = satisfacciones.filter(s => s === 'SATISFECHO').length;
  const pctInsatisfecho = nInsatisfecho / n;
  const pctSatisfecho = nSatisfecho / n;

  // Satisfaction in last 90 days
  const recientesSat = satisfacciones.filter((s, i) => (ahora - fechas[i]) / (1000 * 60 * 60 * 24) <= 90);
  const pctInsatisfechoReciente = recientesSat.length
    ? recientesSat.filter(s => s === 'INSATISFECHO').length / recientesSat.length
    : 0;

  // Satisfaction trend
  let satTrend = 0;
  if (satisfacciones.length >= 2) {
    const satVal = { INSATISFECHO: 0, NEUTRO: 0.5, SATISFECHO: 1 };
    const lastSat = satisfacciones.slice(-5).map(s => satVal[s] || 0.5);
    satTrend = lastSat[lastSat.length - 1] - lastSat[0];
  }

  // Regularity
  const regularidad = 1 / (1 + gapStd);

  // Weekend ratio
  const weekendCount = fechas.filter(f => f.getDay() === 0 || f.getDay() === 6).length;
  const weekendRatio = weekendCount / n;

  // Night interactions (after 8pm)
  const nightCount = fechas.filter(f => f.getHours() >= 20).length;
  const nightRatio = nightCount / n;

  // Build feature vector (same order as Python training)
  const features = [
    recency,                              // 0
    freqTotal,                            // 1
    freqSemanal,                          // 2
    freqMensual,                          // 3
    interaccionesUltimoMes,               // 4
    interaccionesUltimoTrim,              // 5
    ticketPromedio,                       // 6
    ticketTotal,                          // 7
    ticketMax,                            // 8
    ticketMin,                            // 9
    ticketStd,                            // 10
    ticketUltimo,                         // 11
    ticketUltimoMes,                      // 12
    ticketTrend,                          // 13
    diversidadCanal,                      // 14
    pctInsatisfecho,                      // 15
    pctSatisfecho,                        // 16
    pctInsatisfechoReciente,              // 17
    satTrend,                             // 18
    tenure,                               // 19
    gapMean,                              // 20
    gapStd,                               // 21
    gapMax,                               // 22
    regularidad,                          // 23
    weekendRatio,                         // 24
    nightRatio,                           // 25
    canalMasUsado === 'WHATSAPP' ? 1 : 0, // 26
    canalMasUsado === 'INSTAGRAM' ? 1 : 0, // 27
    canalMasUsado === 'RAPPI' ? 1 : 0,    // 28
    canalMasUsado === 'PEDIDOSYA' ? 1 : 0, // 29
    canalMasUsado === 'PRESENCIAL' ? 1 : 0, // 30
  ];

  const prob = sigmoid(predictRaw(features));
  const pct = Number((prob * 100).toFixed(1));
  const nivel = prob < 0.33 ? 'bajo' : prob < 0.66 ? 'medio' : 'alto';

  // Feature importances for explanation
  const featImp = model.feature_importances || [];
  const topFeats = featImp
    .map((imp, i) => ({ name: scaler.feature_names[i], imp, value: features[i] }))
    .sort((a, b) => b.imp - a.imp)
    .slice(0, 5);

  return {
    probabilidad: Number(prob.toFixed(4)),
    nivel,
    pctChurn: pct,
    topFactores: topFeats.map(f => ({
      nombre: f.name,
      importancia: Number(f.imp.toFixed(4)),
      valor: Number(Number(f.value).toFixed(2)),
    })),
    explicacion: `ML predice ${pct}% riesgo de abandono basado en ${n} interacciones`,
  };
}

module.exports = { predictProbability };
