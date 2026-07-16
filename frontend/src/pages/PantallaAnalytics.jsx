import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useStore } from '../store/index';
const BASE = import.meta.env.VITE_API_URL || '/api';
import html2canvas from 'html2canvas';

const COLORES_CLUSTER = ['#c1502e', '#4f7942', '#2e6b8a', '#9c6b3e', '#7a4f8a', '#c98a2e', '#5b3a21', '#b3261e'];

function Barras({ datos, colorBarra, maxBarWidth = 80 }) {
  if (!datos || datos.length === 0) return <p className="sin-datos">Sin datos</p>;
  const maxVal = Math.max(...datos.map((d) => d.count));
  return (
    <div className="grafico-barras">
      {datos.map((d, i) => (
        <div key={i} className="barra-fila">
          <span className="barra-etiqueta">{d.canal || d.rango || d.producto}</span>
          <div className="barra-track">
            <div
              className="barra-relleno"
              style={{
                width: `${Math.max((d.count / maxVal) * maxBarWidth, 6)}%`,
                background: colorBarra || 'var(--color-terracotta)',
              }}
            />
          </div>
          <span className="barra-valor">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function GraficoLinea({ datos, color = '#c1502e' }) {
  if (!datos || datos.length === 0) return <p className="sin-datos">Sin datos</p>;
  const maxVal = Math.max(...datos.map((d) => d.count), 1);
  const w = 600, h = 160, pad = 4;
  const xStep = w / (datos.length - 1 || 1);
  const yScale = (v) => h - (v / maxVal) * (h - pad * 2) - pad;

  const puntos = datos.map((d, i) => `${i * xStep},${yScale(d.count)}`).join(' ');
  const labels = datos.filter((_, i) => i % 5 === 0 || i === datos.length - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} className="grafico-linea">
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={puntos} />
      {datos.map((d, i) => (
        <circle key={i} cx={i * xStep} cy={yScale(d.count)} r="3" fill={color} />
      ))}
      {labels.map((d, i) => {
        const idx = datos.indexOf(d);
        return (
          <text key={i} x={idx * xStep} y={h + 16} textAnchor="middle" fontSize="9" fill="#5b3a21">
            {d.fecha.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

const CANALES = ['', 'PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];

export default function PantallaAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(null);
  const [filtroCanal, setFiltroCanal] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const reporteRef = useRef(null);

  useEffect(() => {
    setCargando(true);
    setError('');
    api.analytics({
      ...(filtroCanal && { canal: filtroCanal }),
      ...(fechaDesde && { fecha_desde: fechaDesde }),
      ...(fechaHasta && { fecha_hasta: fechaHasta }),
    })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [filtroCanal, fechaDesde, fechaHasta]);

  async function handleExportarPNG() {
    if (!reporteRef.current) return;
    setExportando('png');
    try {
      const canvas = await html2canvas(reporteRef.current, {
        backgroundColor: '#faf3ea',
        scale: 2,
        useCORS: true,
      });
      const enlace = document.createElement('a');
      enlace.download = `puku-puku-analytics-${new Date().toISOString().slice(0, 10)}.png`;
      enlace.href = canvas.toDataURL('image/png');
      enlace.click();
    } catch (err) {
      setError(`Error al exportar PNG: ${err.message}`);
    } finally {
      setExportando(null);
    }
  }

  async function handleExportarPDF() {
    if (!reporteRef.current) return;
    setExportando('pdf');
    try {
      const canvas = await html2canvas(reporteRef.current, {
        backgroundColor: '#faf3ea',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const ventana = window.open('', '_blank');
      ventana.document.write(`
        <html><head><title>Puku Puku — Analytics APF3</title>
        <style>
          body { margin: 0; padding: 20px; font-family: sans-serif; text-align: center; }
          img { max-width: 100%; height: auto; }
        </style></head>
        <body>
          <h2 style="color:#5b3a21;margin-bottom:4px;">Puku Puku CRM — Analytics APF3</h2>
          <p style="color:#888;font-size:0.85rem;margin-bottom:20px;">${new Date().toLocaleDateString('es-PE')}</p>
          <img src="${imgData}" />
          <script>window.print();<\/script>
        </body></html>
      `);
      ventana.document.close();
    } catch (err) {
      setError(`Error al exportar PDF: ${err.message}`);
    } finally {
      setExportando(null);
    }
  }

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  const { resumen, porCanal, frecuenciaDistribucion, productosPopulares, heatmap, tendencia } = data;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <h1 className="titulo-pantalla">Analytics APF3</h1>
          <p className="subtitulo-pantalla" style={{ marginBottom: 0 }}>Métricas agregadas del dataset para el notebook de segmentación y churn.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn-secundario" onClick={handleExportarPNG} disabled={exportando !== null} style={{ fontSize: '0.82rem' }}>
            {exportando === 'png' ? 'Exportando…' : '⬇ PNG'}
          </button>
          <button className="btn-principal" onClick={handleExportarPDF} disabled={exportando !== null} style={{ fontSize: '0.82rem' }}>
            {exportando === 'pdf' ? 'Exportando…' : '⬇ PDF'}
          </button>
        </div>
      </div>

      <div className="filtros-analytics">
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-canal">Canal</label>
          <select id="filtro-canal" value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
            <option value="">Todos los canales</option>
            {CANALES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="fecha-desde">Desde</label>
          <input id="fecha-desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="fecha-hasta">Hasta</label>
          <input id="fecha-hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        {(filtroCanal || fechaDesde || fechaHasta) && (
          <button className="btn-secundario" onClick={() => { setFiltroCanal(''); setFechaDesde(''); setFechaHasta(''); }}
            style={{ alignSelf: 'flex-end', fontSize: '0.8rem', padding: '6px 14px' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {cargando && <p className="cargando">Cargando analytics…</p>}

      <div ref={reporteRef} style={{ opacity: cargando ? 0.3 : 1, transition: 'opacity 0.2s' }}>
        <div className="metricas-grid">
          <div className="card metrica-card">
            <span className="metrica-valor">{resumen.totalClientes}</span>
            <span className="metrica-label">Clientes</span>
          </div>
          <div className="card metrica-card">
            <span className="metrica-valor">{resumen.totalInteracciones}</span>
            <span className="metrica-label">Interacciones</span>
          </div>
          <div className="card metrica-card">
            <span className="metrica-valor">{resumen.promedioVisitas}</span>
            <span className="metrica-label">Visitas x cliente</span>
          </div>
          <div className="card metrica-card">
            <span className="metrica-valor" style={{ color: resumen.churnRate > 20 ? 'var(--color-danger)' : undefined }}>
              {resumen.churnRate}%
            </span>
            <span className="metrica-label">Churn rate</span>
          </div>
          <div className="card metrica-card">
            <span className="metrica-valor">{resumen.churnScorePromedio}</span>
            <span className="metrica-label">Churn score prom.</span>
          </div>
        </div>

        <div className="analytics-grid">
          <div className="card">
            <h3>Clientes por canal</h3>
            <Barras datos={porCanal} colorBarra="var(--color-terracotta)" />
          </div>

          <div className="card">
            <h3>Frecuencia de visitas</h3>
            <Barras datos={frecuenciaDistribucion} colorBarra="var(--color-warning)" />
          </div>

          <div className="card">
            <h3>Productos favoritos</h3>
            <Barras datos={productosPopulares} colorBarra="var(--color-success)" />
          </div>

          <div className="card">
            <h3>Ticket promedio por canal</h3>
            {porCanal.length > 0 ? (
              <div className="tabla-ticket">
                {porCanal.map((c, i) => (
                  <div key={i} className="ticket-fila">
                    <span className="ticket-canal">{c.canal}</span>
                    <span className="ticket-monto">S/{c.ticketPromedio}</span>
                    <span className="ticket-churn">{c.churnRate}% churn</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sin-datos">Sin datos</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Interacciones — últimos 30 días</h3>
          <GraficoLinea datos={tendencia} />
        </div>

        {heatmap && heatmap.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Productos por canal</h3>
            <Heatmap data={heatmap} />
          </div>
        )}
      </div>

      <ModeloML />
      <Segmentacion />
    </div>
  );
}


function Heatmap({ data }) {
  if (!data || data.length === 0) return <p className="sin-datos">Sin datos</p>;
  const productos = data[0]?.productos.map((p) => p.producto) || [];
  const maxVal = Math.max(...data.flatMap((r) => r.productos.map((p) => p.count)), 1);

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header">
        <div className="heatmap-corner" />
        {productos.map((p) => (
          <div key={p} className="heatmap-col-label" title={p}>{p}</div>
        ))}
      </div>
      {data.map((fila) => (
        <div key={fila.canal} className="heatmap-fila">
          <div className="heatmap-row-label">{fila.canal}</div>
          {fila.productos.map((celda) => {
            const intensidad = celda.count / maxVal;
            return (
              <div
                key={celda.producto}
                className="heatmap-celda"
                title={`${fila.canal} · ${celda.producto}: ${celda.count}`}
                style={{
                  backgroundColor: celda.count > 0 ? `rgba(193, 80, 46, ${0.1 + intensidad * 0.7})` : 'var(--color-cream)',
                  color: intensidad > 0.5 ? '#fff' : 'var(--color-brown-700)',
                }}
              >
                {celda.count}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MetricasML({ metrics, bestModel }) {
  if (!metrics) return null;
  const cards = [
    { label: 'F1 Score', valor: metrics.f1, color: 'var(--color-success)' },
    { label: 'Precision', valor: metrics.precision, color: 'var(--color-terracotta)' },
    { label: 'Recall', valor: metrics.recall, color: metrics.recall >= 0.95 ? 'var(--color-success)' : 'var(--color-warning)' },
    { label: 'Accuracy', valor: metrics.accuracy, color: 'var(--color-brown-700)' },
  ];

  return (
    <div>
      <div className="ml-metricas-grid">
        {cards.map((c) => (
          <div key={c.label} className="card ml-metrica-card">
            <span className="ml-metrica-valor" style={{ color: c.color }}>
              {(c.valor * 100).toFixed(1)}%
            </span>
            <span className="ml-metrica-label">{c.label}</span>
          </div>
        ))}
      </div>
      {bestModel && (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', margin: '8px 0 0', textAlign: 'center' }}>
          Modelo: <strong>{bestModel}</strong>
        </p>
      )}
    </div>
  );
}

function ProbabilidadChart({ probabilidad }) {
  const pctChurn = probabilidad;
  const pctActivo = 1 - probabilidad;
  const barras = [
    { label: 'Riesgo de abandono', pct: pctChurn, color: 'var(--color-danger)' },
    { label: 'Activo', pct: pctActivo, color: 'var(--color-success)' },
  ];

  return (
    <div className="ml-prob-chart">
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', margin: '0 0 12px', color: 'var(--color-brown-900)' }}>
        Probabilidad estimada
      </h4>
      {barras.map((b) => (
        <div key={b.label} className="ml-prob-fila">
          <span className="ml-prob-etiqueta">{b.label}</span>
          <div className="ml-prob-track">
            <div
              className="ml-prob-relleno"
              style={{
                width: `${Math.max(b.pct * 100, 2)}%`,
                background: b.color,
              }}
            />
          </div>
          <span className="ml-prob-valor">{(b.pct * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function BarraCarga({ progress = 0, message = 'Entrenando modelo…' }) {
  const indet = progress === 0 ? ' indeterminado' : '';
  const pct = Math.min(progress, 100);
  return (
    <div className="ml-carga-wrapper">
      <div className="ml-carga-bar">
        <div className={`ml-carga-relleno${indet}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="ml-carga-texto">{pct > 0 ? `${Math.round(pct)}% — ` : ''}{message}</p>
    </div>
  );
}

function ModeloML() {
  const [entrenando, setEntrenando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState('');

  async function handleEntrenar() {
    setEntrenando(true);
    setError('');
    setResultado(null);
    setProgreso(0);
    setMensaje('Iniciando entrenamiento...');

    console.group('🧠 Puku Puku — Entrenamiento ML (streaming)');

    try {
      const response = await fetch(`${BASE}/reportes/entrenar-stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'text/event-stream' },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) dataStr = line.slice(6);
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === 'log') {
              console.log(`🧠 ${data.message}`);
            } else if (eventType === 'progress') {
              if (data.progress != null) setProgreso(data.progress);
              if (data.message) setMensaje(data.message);
            } else if (eventType === 'done') {
              setProgreso(100);
              setMensaje('Completado');
              console.log('✅ Entrenamiento completado en', ((data.elapsed || 0) / 1000).toFixed(1), 's');
              if (data.results) {
                const r = data.results;
                console.log('Resumen:', { clientes: r.n_customers, features: r.n_features, modelo: r.best_model, churn_rate: r.churn_rate });
                if (r.metrics) {
                  console.table([
                    { Métrica: 'F1 Score', Valor: r.metrics.f1 },
                    { Métrica: 'Precision', Valor: r.metrics.precision },
                    { Métrica: 'Recall', Valor: r.metrics.recall },
                    { Métrica: 'Accuracy', Valor: r.metrics.accuracy },
                    { Métrica: 'ROC-AUC', Valor: r.metrics.roc_auc },
                  ]);
                }
              }
              setResultado(data.results);
              setEntrenando(false);
            } else if (eventType === 'error') {
              console.error('❌', data.message);
              setError(data.message);
              setEntrenando(false);
            }
          } catch (parseErr) {
            console.warn('Parse error:', parseErr.message, dataStr.slice(0, 100));
          }
        }
      }
    } catch (err) {
      console.error('❌ Error entrenando modelo:', err);
      setError(err.message);
    } finally {
      console.groupEnd();
      setEntrenando(false);
    }
  }

  const usuario = useStore((s) => s.usuario);
  const puedeEntrenar = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'GERENTE';

  return (
    <div style={{ marginTop: 24 }}>
      <div className="card">
        <div className="segmentacion-header">
          <h3>Modelo ML — Predicción de Churn</h3>
          <div className="segmentacion-controls">
            {puedeEntrenar && (
              <button className="btn-principal" onClick={handleEntrenar} disabled={entrenando}>
                {entrenando ? 'Entrenando…' : 'Entrenar modelo'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {entrenando && <BarraCarga progress={progreso} message={mensaje} />}

        {resultado && resultado.metrics && (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', margin: '10px 0 16px' }}>
              Entrenado con {resultado.clientes} clientes · {resultado.n_customers || resultado.clientes} muestras sintéticas · {resultado.n_features} features
            </p>
            <MetricasML metrics={resultado.metrics} bestModel={resultado.best_model} />
            {resultado.churn_rate != null && <ProbabilidadChart probabilidad={resultado.churn_rate} />}
          </>
        )}

        {!resultado && !error && !entrenando && (
          <p className="sin-datos" style={{ marginTop: 12 }}>
            Entrena el modelo de ML con los datos actuales del CRM para predecir riesgo de abandono.
            Una vez entrenado, las predicciones aparecerán en la ficha de cada cliente.
          </p>
        )}
      </div>
    </div>
  );
}

function Segmentacion() {
  const [k, setK] = useState(3);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const usuario = useStore((s) => s.usuario);
  const puedeEntrenar = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'GERENTE';

  async function handleSegmentar() {
    setCargando(true);
    setError('');
    try {
      const res = await api.segmentacion(k);
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="card">
        <div className="segmentacion-header">
          <h3>Segmentación K-Means</h3>
          <div className="segmentacion-controls">
            {puedeEntrenar && (
              <>
                <label>Clusters (k):
                  <select value={k} onChange={(e) => setK(Number(e.target.value))} style={{ marginLeft: 8 }}>
                    {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button className="btn-principal" onClick={handleSegmentar} disabled={cargando}>
                  {cargando ? 'Segmentando…' : 'Segmentar'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {resultado && (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', margin: '10px 0 16px' }}>
              Inercia: {resultado.inertia} · {resultado.iteraciones} iteraciones
            </p>

            <div className="clusters-grid">
              {resultado.perfiles.map((p, i) => (
                <div key={p.cluster} className="card cluster-card" style={{ borderTop: `4px solid ${COLORES_CLUSTER[i % COLORES_CLUSTER.length]}` }}>
                  <div className="cluster-header">
                    <span className="cluster-num" style={{ background: COLORES_CLUSTER[i % COLORES_CLUSTER.length] }}>
                      C{p.cluster + 1}
                    </span>
                    <span className="cluster-label">{resultado.muestras[i].etiqueta}</span>
                  </div>
                  <div className="cluster-stat">{p.size} clientes ({p.pct}%)</div>
                  <div className="cluster-metrics">
                    <span>🎯 {p.frecuenciaPromedio} visitas</span>
                    <span>💰 S/{p.ticketPromedio}</span>
                    <span className={p.churnRate > 50 ? 'churn-alto' : ''}>⚠ {p.churnRate}% churn</span>
                  </div>
                  <details className="cluster-detalle">
                    <summary>Ver muestra ({p.size} clientes)</summary>
                    {resultado.muestras[i].clientes.map((c, j) => (
                      <div key={j} className="cluster-cliente" style={{ fontSize: '0.78rem', padding: '3px 0', borderBottom: '1px solid var(--color-sand)' }}>
                        {c.nombre} · {c.frecuencia_visita}vis · S/{c.ticket_promedio_soles} · {c.canal_origen}
                        {c.churn_label === 1 && <span style={{ color: 'var(--color-danger)', marginLeft: 4 }}>⚠</span>}
                      </div>
                    ))}
                  </details>
                </div>
              ))}
            </div>
          </>
        )}

        {!resultado && !cargando && (
          <p className="sin-datos" style={{ marginTop: 12 }}>
            Presiona "Segmentar" para ejecutar K-Means sobre el dataset APF3 ({k} clusters).
          </p>
        )}
      </div>
    </div>
  );
}
