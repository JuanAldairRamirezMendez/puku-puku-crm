import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
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

function ModeloML() {
  const [entrenando, setEntrenando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  async function handleEntrenar() {
    setEntrenando(true);
    setError('');
    setResultado(null);
    try {
      const res = await api.entrenarModelo();
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEntrenando(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="card">
        <div className="segmentacion-header">
          <h3>Modelo ML — Predicción de Churn</h3>
          <div className="segmentacion-controls">
            <button className="btn-principal" onClick={handleEntrenar} disabled={entrenando}>
              {entrenando ? 'Entrenando...' : 'Entrenar modelo con datos del CRM'}
            </button>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {resultado && (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', margin: '10px 0 16px' }}>
              Modelo entrenado con {resultado.clientes} clientes · {resultado.mensaje}
            </p>
            {resultado.log && resultado.log.length > 0 && (
              <pre style={{ fontSize: '0.75rem', background: '#f5ede4', padding: 12, borderRadius: 6, maxHeight: 200, overflow: 'auto' }}>
                {resultado.log.join('\n')}
              </pre>
            )}
          </>
        )}

        {!resultado && !error && !entrenando && (
          <p className="sin-datos" style={{ marginTop: 12 }}>
            Entrena el modelo de Regresión Logística con los datos actuales del CRM para predecir riesgo de abandono.
            Una vez entrenado, aparecerá en la ficha de cada cliente.
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
            <label>Clusters (k):
              <select value={k} onChange={(e) => setK(Number(e.target.value))} style={{ marginLeft: 8 }}>
                {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button className="btn-principal" onClick={handleSegmentar} disabled={cargando}>
              {cargando ? 'Segmentando…' : 'Segmentar'}
            </button>
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
