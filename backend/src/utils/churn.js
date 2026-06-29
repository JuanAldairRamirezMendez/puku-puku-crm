function calcularChurnLabel(fechaUltimaInteraccion, diasInactividad = 30) {
  if (!fechaUltimaInteraccion) return 1;
  const ahora = new Date();
  const diffMs = ahora - new Date(fechaUltimaInteraccion);
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  return diffDias > diasInactividad ? 1 : 0;
}

function calcularChurnScore(interacciones, diasInactividad = 30) {
  if (!interacciones || interacciones.length === 0) return 0.92;

  const ahora = new Date();
  const ultimaFecha = new Date(interacciones[0].fecha);
  const diffDias = (ahora - ultimaFecha) / (1000 * 60 * 60 * 24);

  // Recency: sigmoid centrado en diasInactividad
  // diff=0  → ~0.05,  diff=30 → ~0.50,  diff=60 → ~0.95
  const recencyScore = 1 / (1 + Math.exp(-0.12 * (diffDias - diasInactividad)));

  // Frequency: a más visitas, menor riesgo
  const n = interacciones.length;
  const freqScore = Math.max(0, 1 - n / 20);

  // Monetary: a mayor ticket promedio, menor riesgo
  const conMonto = interacciones.filter((i) => i.montoSoles !== null);
  const avgTicket = conMonto.length > 0
    ? conMonto.reduce((s, i) => s + Number(i.montoSoles), 0) / conMonto.length
    : 0;
  const monetaryScore = Math.max(0, 1 - avgTicket / 45);

  // Satisfaction: % de insatisfechos en los últimos 90 días
  const recientes = interacciones.filter((i) => {
    const d = (ahora - new Date(i.fecha)) / (1000 * 60 * 60 * 24);
    return d <= 90;
  });
  const insatisfechos = recientes.filter((i) => i.satisfaccion === 'INSATISFECHO').length;
  const satScore = recientes.length > 0 ? insatisfechos / recientes.length : 0;

  const score = recencyScore * 0.50 + freqScore * 0.20 + monetaryScore * 0.15 + satScore * 0.15;
  return Number(Math.min(1, Math.max(0, score)).toFixed(4));
}

module.exports = { calcularChurnLabel, calcularChurnScore };
