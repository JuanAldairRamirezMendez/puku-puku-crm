const prisma = require('../config/db');
const { calcularChurnLabel, calcularChurnScore } = require('../utils/churn');
const { arrayToCsv } = require('../utils/exportCsv');
const { kmeans } = require('../utils/kmeans');
const { predecirChurn: mlPredecir, predecirBatch, entrenarModelo, modeloExiste } = require('../utils/predecirChurnPython');

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
    const churnScore = calcularChurnScore(cliente.interacciones, DIAS_INACTIVIDAD());

    return {
      nombre: cliente.nombreCompleto,
      frecuencia_visita: frecuenciaVisita,
      ticket_promedio_soles: ticketPromedioSoles,
      gasto_total_mensual_estimado: Number((frecuenciaVisita * ticketPromedioSoles).toFixed(2)),
      canal_origen: cliente.canalOrigen,
      producto_favorito: cliente.productoFavorito || 'N/A',
      churn_label: churnLabel,
      churn_score: churnScore,
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
      'gasto_total_mensual_estimado',
      'canal_origen',
      'producto_favorito',
      'churn_label',
      'churn_score',
    ];
    const csv = arrayToCsv(data, columnas);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dataset_apf3_puku_puku.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reportes/segmentacion
 * Ejecuta K-Means sobre el dataset APF3: frecuencia_visita, ticket_promedio_soles,
 * churn_label. Devuelve centroides, asignaciones por cliente y perfiles de cada
 * segmento. k por defecto=3, configurable via body { k }.
 */
async function segmentacion(req, res, next) {
  try {
    const k = Math.max(2, Math.min(8, Number(req.body?.k || 3)));
    const raw = await construirDataset();

    // Normalizar features numéricas
    const features = raw.map((r) => [r.frecuencia_visita, r.ticket_promedio_soles, r.churn_label]);
    const mins = features[0].map((_, i) => Math.min(...features.map((f) => f[i])));
    const maxs = features[0].map((_, i) => Math.max(...features.map((f) => f[i])));
    const normalized = features.map((f) =>
      f.map((v, i) => (maxs[i] === mins[i] ? 0 : (v - mins[i]) / (maxs[i] - mins[i])))
    );

    const validK = Math.min(k, normalized.length);
    const result = kmeans(normalized, validK);

    // Denormalizar centroides y armar perfiles
    const centroids = result.centroids.map((c) => ({
      frecuencia_visita: Number((c[0] * (maxs[0] - mins[0]) + mins[0]).toFixed(2)),
      ticket_promedio_soles: Number((c[1] * (maxs[1] - mins[1]) + mins[1]).toFixed(2)),
      churn_label: Math.round(c[2] * (maxs[2] - mins[2]) + mins[2]),
    }));

    const clusters = {};
    for (let i = 0; i < raw.length; i++) {
      const cid = result.assignments[i];
      if (!clusters[cid]) clusters[cid] = { clientes: [], size: 0 };
      clusters[cid].clientes.push({
        nombre: raw[i].nombre,
        frecuencia_visita: raw[i].frecuencia_visita,
        ticket_promedio_soles: raw[i].ticket_promedio_soles,
        canal_origen: raw[i].canal_origen,
        producto_favorito: raw[i].producto_favorito,
        churn_label: raw[i].churn_label,
      });
      clusters[cid].size++;
    }

    const perfiles = Object.entries(clusters).map(([cid, cl]) => {
      const freqs = cl.clientes.map((c) => c.frecuencia_visita);
      const tickets = cl.clientes.map((c) => c.ticket_promedio_soles);
      const churns = cl.clientes.filter((c) => c.churn_label === 1).length;
      return {
        cluster: Number(cid),
        size: cl.size,
        pct: Number(((cl.size / raw.length) * 100).toFixed(1)),
        frecuenciaPromedio: Number((freqs.reduce((s, v) => s + v, 0) / freqs.length).toFixed(2)),
        ticketPromedio: Number((tickets.reduce((s, v) => s + v, 0) / tickets.length).toFixed(2)),
        churnRate: Number(((churns / cl.size) * 100).toFixed(1)),
        centroide: centroids[cid],
      };
    }).sort((a, b) => b.size - a.size);

    return res.json({
      k: validK,
      inertia: Number(result.inertia.toFixed(2)),
      iteraciones: result.iterations,
      perfiles,
      muestras: perfiles.map((p) => ({
        cluster: p.cluster,
        etiqueta: etiquetarSegmento(p),
        clientes: clusters[p.cluster].clientes.slice(0, 10),
        totalEnCluster: p.size,
      })),
    });
  } catch (err) {
    next(err);
  }
}

function etiquetarSegmento(p) {
  if (p.churnRate > 50) return p.frecuenciaPromedio < 2 ? 'Nuevos inactivos' : 'En riesgo de abandono';
  if (p.frecuenciaPromedio >= 6 && p.ticketPromedio >= 20) return 'Alto valor — frecuentes';
  if (p.frecuenciaPromedio >= 3) return 'Regulares — fidelizar';
  return 'Baja actividad — reactivar';
}

/**
 * GET /api/reportes/analytics
 * Métricas agregadas para el dashboard visual de APF3: distribución por canal,
 * productos populares, churn por canal, ticket promedio, frecuencia de visitas
 * y tendencia de interacciones en los últimos 30 días.
 */
async function analytics(req, res, next) {
  try {
    const { canal, fecha_desde, fecha_hasta } = req.query;

    const whereCliente = canal ? { canalOrigen: canal } : {};

    const includeInteracciones = {
      orderBy: { fecha: 'desc' },
      ...(fecha_desde || fecha_hasta ? {
        where: {
          ...(fecha_desde ? { fecha: { gte: new Date(fecha_desde) } } : {}),
          ...(fecha_hasta ? { fecha: { lte: new Date(fecha_hasta + 'T23:59:59.999Z') } } : {}),
        },
      } : {}),
    };

    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      include: { interacciones: includeInteracciones },
    });

    const totalClientes = clientes.length;
    let totalInteracciones = 0;
    let churnCount = 0;
    const porCanal = {};
    const churnPorCanal = {};
    const productosCount = {};
    const productosPorCanal = {};
    const frecuencias = { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '10+': 0 };
    const ticketPorCanal = {};
    const tendenciaDiaria = {};
    const now = Date.now();

    let sumaChurnScore = 0;

    for (const cli of clientes) {
      const interacciones = cli.interacciones;
      const n = interacciones.length;
      totalInteracciones += n;
      const canal = cli.canalOrigen;

      // Por canal
      porCanal[canal] = (porCanal[canal] || 0) + 1;

      // Churn por canal
      const ultima = interacciones[0]?.fecha;
      const churn = !ultima || (now - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24) > 30;
      if (churn) {
        churnCount++;
        churnPorCanal[canal] = (churnPorCanal[canal] || 0) + 1;
      }

      sumaChurnScore += calcularChurnScore(interacciones, 30);

      // Productos
      if (cli.productoFavorito) {
        productosCount[cli.productoFavorito] = (productosCount[cli.productoFavorito] || 0) + 1;
        if (!productosPorCanal[canal]) productosPorCanal[canal] = {};
        productosPorCanal[canal][cli.productoFavorito] = (productosPorCanal[canal][cli.productoFavorito] || 0) + 1;
      }

      // Frecuencia
      if (n === 0) frecuencias['0']++;
      else if (n <= 2) frecuencias['1-2']++;
      else if (n <= 5) frecuencias['3-5']++;
      else if (n <= 10) frecuencias['6-10']++;
      else frecuencias['10+']++;

      // Ticket promedio por canal
      const conMonto = interacciones.filter((i) => i.montoSoles !== null);
      if (conMonto.length > 0) {
        const suma = conMonto.reduce((acc, i) => acc + Number(i.montoSoles), 0);
        if (!ticketPorCanal[canal]) ticketPorCanal[canal] = { suma: 0, count: 0 };
        ticketPorCanal[canal].suma += suma;
        ticketPorCanal[canal].count += conMonto.length;
      }

      // Tendencia diaria (últimos 30 días)
      for (const i of interacciones) {
        const diffDias = Math.floor((now - new Date(i.fecha).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias >= 0 && diffDias <= 30) {
          const key = new Date(i.fecha).toISOString().slice(0, 10);
          tendenciaDiaria[key] = (tendenciaDiaria[key] || 0) + 1;
        }
      }
    }

    // Armar respuesta
    const canales = Object.entries(porCanal).map(([canal, count]) => ({
      canal,
      count,
      churnRate: churnPorCanal[canal] ? Number(((churnPorCanal[canal] / count) * 100).toFixed(1)) : 0,
      ticketPromedio: ticketPorCanal[canal]
        ? Number((ticketPorCanal[canal].suma / ticketPorCanal[canal].count).toFixed(2))
        : 0,
    }));

    const productosPopulares = Object.entries(productosCount)
      .map(([producto, count]) => ({ producto, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Completar días sin interacciones con 0
    const tendencia = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      tendencia.push({ fecha: key, count: tendenciaDiaria[key] || 0 });
    }

    // Mapa de calor producto x canal
    const productosTop = productosPopulares.map((p) => p.producto);
    const canalesLista = Object.keys(productosPorCanal).sort();
    const heatmap = canalesLista.map((c) => ({
      canal: c,
      productos: productosTop.map((p) => ({
        producto: p,
        count: productosPorCanal[c]?.[p] || 0,
      })),
    }));

    return res.json({
      resumen: {
        totalClientes,
        totalInteracciones,
        promedioVisitas: totalClientes > 0 ? Number((totalInteracciones / totalClientes).toFixed(1)) : 0,
        churnRate: totalClientes > 0 ? Number(((churnCount / totalClientes) * 100).toFixed(1)) : 0,
        churnCount,
        churnScorePromedio: totalClientes > 0 ? Number((sumaChurnScore / totalClientes).toFixed(4)) : 0,
      },
      porCanal: canales,
      frecuenciaDistribucion: Object.entries(frecuencias).map(([rango, count]) => ({ rango, count })),
      productosPopulares,
      heatmap,
      tendencia,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reportes/predecir-churn
 * ML: Predice churn usando el modelo entrenado (Regresión Logística).
 * Body: { clientes: [{ frecuencia_visita, ticket_promedio_soles, canal_origen, producto_favorito }] }
 *       o un solo objeto con los mismos campos.
 */
async function predecirChurn(req, res, next) {
  try {
    if (!modeloExiste()) {
      return res.status(400).json({
        error: 'Modelo no entrenado. Ejecuta POST /api/reportes/entrenar-modelo primero.',
      });
    }

    const input = req.body.clientes || req.body;

    if (Array.isArray(input)) {
      if (input.length === 0) {
        return res.status(400).json({ error: 'Lista de clientes vacia.' });
      }
      const resultados = await predecirBatch(input);
      return res.json({ total: resultados.length, predicciones: resultados });
    }

    const resultado = await mlPredecir(input);
    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reportes/predecir-churn/:id
 * ML: Predice churn para un cliente específico del CRM.
 */
async function predecirChurnCliente(req, res, next) {
  try {
    if (!modeloExiste()) {
      return res.status(400).json({
        error: 'Modelo no entrenado. Ejecuta POST /api/reportes/entrenar-modelo primero.',
      });
    }

    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: { interacciones: { orderBy: { fecha: 'desc' } } },
    });

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const conMonto = cliente.interacciones.filter((i) => i.montoSoles !== null);
    const frecuenciaVisita = cliente.interacciones.length;
    const ticketPromedioSoles = conMonto.length > 0
      ? Number((conMonto.reduce((acc, i) => acc + Number(i.montoSoles), 0) / conMonto.length).toFixed(2))
      : 0;

    const input = {
      frecuencia_visita: frecuenciaVisita,
      ticket_promedio_soles: ticketPromedioSoles,
      canal_origen: cliente.canalOrigen,
      producto_favorito: cliente.productoFavorito || 'N/A',
    };

    const prediccion = await mlPredecir(input);
    return res.json({
      clienteId: id,
      nombre: cliente.nombreCompleto,
      ...prediccion,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reportes/entrenar-modelo
 * ML: Reentrena el modelo con los datos actuales del CRM.
 */
async function reentrenarModelo(req, res, next) {
  try {
    const data = await construirDataset();
    const fs = require('fs');
    const path = require('path');
    const csvPath = path.resolve(__dirname, '../../../apf3/dataset_crm_actual.csv');
    const columnas = ['nombre', 'frecuencia_visita', 'ticket_promedio_soles', 'gasto_total_mensual_estimado', 'canal_origen', 'producto_favorito', 'churn_label', 'churn_score'];
    const csv = arrayToCsv(data, columnas);
    fs.writeFileSync(csvPath, csv, 'utf-8');

    const result = await entrenarModelo();
    return res.json({
      mensaje: 'Modelo reentrenado exitosamente.',
      clientes: data.length,
      log: result.stdout.split('\n').filter((l) => l.startsWith('  >>') || l.includes('Accuracy') || l.includes('Guardado')).slice(0, 20),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { clientesFrecuentes, dataset, exportarCsv, analytics, segmentacion, predecirChurn, predecirChurnCliente, reentrenarModelo };
