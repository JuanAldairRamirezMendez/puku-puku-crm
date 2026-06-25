const prisma = require('../config/db');
const { calcularChurnLabel } = require('../utils/churn');
const { arrayToCsv } = require('../utils/exportCsv');

const DIAS_INACTIVIDAD = () => Number(process.env.CHURN_INACTIVITY_DAYS || 30);

/**
 * Construye, para cada cliente, las variables del dataset de APF3:
 * frecuencia_visita, ticket_promedio_soles, canal_origen, producto_favorito,
 * churn_label. Es el puente estructural APF2 -> APF3 que describe el
 * documento (sección 4.3.4: Relación entre el Product Backlog y el dataset).
 */
async function construirDataset() {
  const clientes = await prisma.cliente.findMany({
    include: { interacciones: { orderBy: { fecha: 'desc' } } },
  });

  return clientes.map((cliente) => {
    const conMonto = cliente.interacciones.filter((i) => i.montoSoles !== null);
    const frecuenciaVisita = cliente.interacciones.length;
    const ticketPromedioSoles =
      conMonto.length > 0
        ? Number(
            (
              conMonto.reduce((acc, i) => acc + Number(i.montoSoles), 0) / conMonto.length
            ).toFixed(2)
          )
        : 0;
    const churnLabel = calcularChurnLabel(
      cliente.interacciones[0]?.fecha,
      DIAS_INACTIVIDAD()
    );

    return {
      nombre: cliente.nombreCompleto,
      frecuencia_visita: frecuenciaVisita,
      ticket_promedio_soles: ticketPromedioSoles,
      canal_origen: cliente.canalOrigen,
      producto_favorito: cliente.productoFavorito || 'N/A',
      churn_label: churnLabel,
    };
  });
}

/**
 * GET /api/reportes/clientes-frecuentes?minVisitas=3
 * US04 — Reporte de clientes recurrentes para monitoreo de retención.
 */
async function clientesFrecuentes(req, res, next) {
  try {
    const minVisitas = Number(req.query.minVisitas || 3);
    const dataset = await construirDataset();
    const frecuentes = dataset
      .filter((c) => c.frecuencia_visita >= minVisitas)
      .sort((a, b) => b.frecuencia_visita - a.frecuencia_visita);

    return res.json({ minVisitas, total: frecuentes.length, clientes: frecuentes });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reportes/dataset
 * US06/US07 — Dataset agregado en JSON, listo para alimentar la
 * segmentación K-Means / modelo de churn que se desarrollará en APF3.
 */
async function dataset(req, res, next) {
  try {
    const data = await construirDataset();
    return res.json({ total: data.length, registros: data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reportes/export-apf3.csv
 * Exporta el mismo dataset en CSV — compatible con pandas/scikit-learn,
 * listo para el notebook Python que pide la consigna de APF3 (Paso 2).
 */
async function exportarCsv(req, res, next) {
  try {
    const data = await construirDataset();
    const columnas = [
      'nombre',
      'frecuencia_visita',
      'ticket_promedio_soles',
      'canal_origen',
      'producto_favorito',
      'churn_label',
    ];
    const csv = arrayToCsv(data, columnas);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dataset_apf3_puku_puku.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { clientesFrecuentes, dataset, exportarCsv };
