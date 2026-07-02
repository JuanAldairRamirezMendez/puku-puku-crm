import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Pantalla3PostAtencion from './Pantalla3PostAtencion.jsx';

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];
const ITEMS_POR_PAGINA = 10;

function formatearFecha(fechaISO) {
  return new Date(fechaISO).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function diasDesde(fechaISO) {
  return Math.floor((Date.now() - new Date(fechaISO).getTime()) / (1000 * 60 * 60 * 24));
}

function semanaISO(fecha) {
  const d = new Date(fecha);
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - d.getDay());
  inicio.setHours(0, 0, 0, 0);
  return inicio.toISOString().slice(0, 10);
}

export default function Pantalla2Historial({ clienteId, onVolver }) {
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState('');
  const [canalNuevaAtencion, setCanalNuevaAtencion] = useState('');
  const [interaccionEnCurso, setInteraccionEnCurso] = useState(null);
  const [paginaFeed, setPaginaFeed] = useState(1);

  async function cargarCliente() {
    try {
      const data = await api.obtenerCliente(clienteId);
      setCliente(data);
      setPaginaFeed(1);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { cargarCliente(); }, [clienteId]);

  async function iniciarAtencion() {
    if (!canalNuevaAtencion) return;
    try {
      const interaccion = await api.crearInteraccion(clienteId, { canal: canalNuevaAtencion });
      setInteraccionEnCurso(interaccion);
    } catch (err) { setError(err.message); }
  }

  async function handleCierreCompletado() {
    setInteraccionEnCurso(null);
    setCanalNuevaAtencion('');
    await cargarCliente();
  }

  // Cálculos de churn y factores de riesgo
  const churnAnalysis = useMemo(() => {
    if (!cliente) return null;
    const ints = cliente.interacciones;
    const n = ints.length;
    const ultima = ints[0]?.fecha;
    const diffDias = ultima ? diasDesde(ultima) : 999;
    const churnLabel = !ultima || diffDias > 30 ? 1 : 0;
    const score = cliente.metricas?.churnScore ?? 0;
    const nivel = score < 0.33 ? 'bajo' : score < 0.66 ? 'medio' : 'alto';

    // Factores
    const factores = [];

    // Recencia
    if (ultima) {
      factores.push({
        icono: '🕐',
        texto: `${diffDias} días sin visitar` + (n >= 3 ? ` (antes: cada ${Math.round(ints.slice(0, 3).reduce((s, x, i, a) => s + diasDesde(x.fecha) / Math.max(1, a.length - 1), 0))} días)` : ''),
        severidad: diffDias > 30 ? 'alta' : diffDias > 14 ? 'media' : 'baja',
      });
    } else {
      factores.push({ icono: '🕐', texto: 'Sin visitas registradas', severidad: 'alta' });
    }

    // Frecuencia
    const freqRiesgo = Math.max(0, 1 - n / 20);
    factores.push({
      icono: '📊',
      texto: `${n} visitas en total${n < 3 ? ' — muy pocas para generar hábito' : n < 6 ? ' — ritmo moderado' : ' — buena consistencia'}`,
      severidad: freqRiesgo > 0.5 ? 'alta' : freqRiesgo > 0.2 ? 'media' : 'baja',
    });

    // Ticket promedio
    const conMonto = ints.filter((i) => i.montoSoles !== null);
    const avgTicket = conMonto.length > 0 ? conMonto.reduce((s, i) => s + Number(i.montoSoles), 0) / conMonto.length : 0;
    if (conMonto.length >= 2) {
      const recienteAvg = conMonto.slice(0, Math.min(3, conMonto.length)).reduce((s, i) => s + Number(i.montoSoles), 0) / Math.min(3, conMonto.length);
      const antiguoAvg = conMonto.slice(-3).reduce((s, i) => s + Number(i.montoSoles), 0) / Math.min(3, conMonto.length);
      if (antiguoAvg > 0 && recienteAvg < antiguoAvg * 0.85) {
        factores.push({
          icono: '💰',
          texto: `Ticket promedio bajó ${Math.round((1 - recienteAvg / antiguoAvg) * 100)}% en los últimos pedidos`,
          severidad: 'media',
        });
      }
    }

    // Canal único
    const canales = new Set(ints.map((i) => i.canal));
    if (canales.size === 1 && n > 1) {
      factores.push({
        icono: '📱',
        texto: `Canal único: ${[...canales][0]} — sin diversificación de contacto`,
        severidad: 'media',
      });
    }

    // Satisfacción
    const recientes90 = ints.filter((i) => diasDesde(i.fecha) <= 90);
    const insatisfechos = recientes90.filter((i) => i.satisfaccion === 'INSATISFECHO').length;
    if (insatisfechos > 0) {
      factores.push({
        icono: '😞',
        texto: `${insatisfechos} atención(es) insatisfactoria(s) en los últimos 90 días`,
        severidad: 'alta',
      });
    }

    // Sparkline: visitas por semana (últimas 10 semanas)
    const semanas = [];
    const ahora = new Date();
    for (let w = 9; w >= 0; w--) {
      const inicioSem = new Date(ahora);
      inicioSem.setDate(ahora.getDate() - ahora.getDay() - w * 7);
      inicioSem.setHours(0, 0, 0, 0);
      const finSem = new Date(inicioSem);
      finSem.setDate(inicioSem.getDate() + 6);
      const count = ints.filter((i) => {
        const d = new Date(i.fecha);
        return d >= inicioSem && d <= finSem;
      }).length;
      semanas.push(count);
    }

    // Acción sugerida
    let accion = '';
    if (churnLabel === 1 && ultima) {
      accion = `Enviar cupón de descuento por ${cliente.canalOrigen} para recuperar al cliente (${diffDias} días inactivo).`;
    } else if (n < 3) {
      accion = `Ofrecer tarjeta de fidelidad en la próxima visita para incentivar recurrencia.`;
    } else if (factores.some((f) => f.severidad === 'alta')) {
      accion = `Priorizar atención personalizada y consultar si ha tenido mala experiencia.`;
    } else {
      accion = `Cliente activo. Mantener calidad de servicio y registrar cada interacción.`;
    }

    const puntajeAnterior = churnLabel === 0 ? Math.max(0, score - 0.09) : Math.min(1, score + 0.05);

    return {
      score, nivel, churnLabel, diffDias, n, avgTicket,
      factores: factores.slice(0, 5),
      semanas,
      accion,
      tendencia: puntajeAnterior >= 0 ? `${score > puntajeAnterior ? 'sube' : 'baja'} vs mes anterior` : null,
      diffPts: Math.round(Math.abs(score - puntajeAnterior) * 100),
    };
  }, [cliente]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!cliente) return <p>Cargando…</p>;

  const iniciales = cliente.nombreCompleto.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const totalInteracciones = cliente.interacciones.length;
  const totalPaginas = Math.ceil(totalInteracciones / ITEMS_POR_PAGINA);
  const interaccionesPaginadas = cliente.interacciones.slice(0, paginaFeed * ITEMS_POR_PAGINA);
  const hayMas = paginaFeed < totalPaginas;
  const maxSpark = churnAnalysis ? Math.max(...churnAnalysis.semanas, 1) : 1;
  const svgH = 72;
  const svgW = 200;
  const sparkPts = churnAnalysis
    ? churnAnalysis.semanas.map((v, i) => `${(i / 9) * svgW},${svgH - (v / maxSpark) * (svgH - 8) - 4}`).join(' ')
    : '';

  // Determinar rango de días entre visitas
  const intsConsecutivas = cliente.interacciones;
  let intervaloPromedio = null;
  if (intsConsecutivas.length >= 2) {
    let total = 0;
    for (let i = 0; i < intsConsecutivas.length - 1; i++) {
      total += Math.abs(diasDesde(intsConsecutivas[i].fecha) - diasDesde(intsConsecutivas[i + 1].fecha));
    }
    intervaloPromedio = Math.round(total / (intsConsecutivas.length - 1));
  }

  return (
    <div>
      <button className="btn-secundario" onClick={onVolver} style={{ marginBottom: 16 }}>← Volver a búsqueda</button>

      {interaccionEnCurso && (
        <Pantalla3PostAtencion
          interaccion={interaccionEnCurso}
          clienteNombre={cliente.nombreCompleto}
          onCerrar={handleCierreCompletado}
          onCancelar={() => setInteraccionEnCurso(null)}
        />
      )}

      <div className="p2-layout">
        {/* SIDEBAR — Perfil + Análisis de Churn */}
        <aside className="p2-sidebar">
          {/* Header — Avatar + datos */}
          <div className="p2-sb-header">
            <div className="p2-avatar">{iniciales}</div>
            <h2 className="p2-sb-nombre">{cliente.nombreCompleto}</h2>
            <p className="p2-sb-telefono">{cliente.telefono}</p>
            <span className="etiqueta-canal">{cliente.canalOrigen}</span>
          </div>

          {/* Producto favorito */}
          {cliente.productoFavorito && (
            <div className="p2-sb-chip">{cliente.productoFavorito}</div>
          )}

          {/* Riesgo de fuga */}
          {churnAnalysis && (
            <div className="p2-sb-seccion">
              <div className="p2-sb-sec-titulo">Riesgo de fuga</div>
              <div className="p2-churn-header">
                <span className={`p2-churn-pct nivel-${churnAnalysis.nivel}`}>
                  {(churnAnalysis.score * 100).toFixed(0)}%
                </span>
                <div className="p2-churn-bar-track">
                  <div className={`p2-churn-bar-fill nivel-${churnAnalysis.nivel}`}
                    style={{ width: `${(churnAnalysis.score * 100).toFixed(0)}%` }} />
                </div>
              </div>
              <p className="p2-churn-contexto">
                {churnAnalysis.nivel === 'alto' ? 'Riesgo alto' : churnAnalysis.nivel === 'medio' ? 'Riesgo moderado' : 'Riesgo bajo'}
                {churnAnalysis.tendencia && ` · ${churnAnalysis.tendencia} (+${churnAnalysis.diffPts} pts)`}
              </p>
            </div>
          )}

          {/* Sparkline — Frecuencia de visitas (últimas 10 semanas) */}
          {churnAnalysis && (
            <div className="p2-sb-seccion">
              <div className="p2-sb-sec-titulo">Frecuencia de visitas — últimas 10 semanas</div>
              <svg className="p2-sparkline" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
                <polyline fill="none" stroke="#D8552C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={sparkPts} />
                {churnAnalysis.semanas.map((v, i) => (
                  <circle key={i} cx={(i / 9) * svgW} cy={svgH - (v / maxSpark) * (svgH - 8) - 4}
                    r={i === 9 ? 4 : 2.5} fill={i === 9 ? '#B9432A' : '#D8552C'} />
                ))}
              </svg>
              <div className="p2-spark-labels">
                <span>-10 sem</span>
                <span>hoy</span>
              </div>
            </div>
          )}

          {/* Factores del riesgo */}
          {churnAnalysis && churnAnalysis.factores.length > 0 && (
            <div className="p2-sb-seccion">
              <div className="p2-sb-sec-titulo">Factores del riesgo</div>
              <div className="p2-factores">
                {churnAnalysis.factores.map((f, i) => (
                  <div key={i} className={`p2-factor severidad-${f.severidad}`}>
                    <span className="p2-factor-icono">{f.icono}</span>
                    <span className="p2-factor-texto">{f.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPIs — Visitas totales + Ticket promedio */}
          <div className="p2-sb-kpis">
            <div className="p2-sb-kpi">
              <span className="p2-sb-kpi-valor">{churnAnalysis?.n ?? totalInteracciones}</span>
              <span className="p2-sb-kpi-label">Visitas totales</span>
            </div>
            <div className="p2-sb-kpi">
              <span className="p2-sb-kpi-valor">S/{cliente.metricas?.ticketPromedioSoles ?? '—'}</span>
              <span className="p2-sb-kpi-label">Ticket promedio</span>
            </div>
          </div>

          {/* Adicional: intervalo entre visitas */}
          {intervaloPromedio !== null && (
            <p className="p2-sb-detalle">Intervalo promedio entre visitas: cada {intervaloPromedio} días</p>
          )}
          {cliente.restriccionesAlergias && (
            <p className="p2-sb-detalle" style={{ color: 'var(--color-danger)' }}>
              ⚠ Alergias: {cliente.restriccionesAlergias}
            </p>
          )}

          {/* Acción sugerida */}
          {churnAnalysis && (
            <div className="p2-accion">
              <span className="p2-accion-icono">💡</span>
              <span className="p2-accion-texto">{churnAnalysis.accion}</span>
            </div>
          )}
        </aside>

        {/* RIGHT — Historial */}
        <div className="p2-main">
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <div className="canal-selector" style={{ flex: 1 }}>
                {CANALES.map((canal) => (
                  <button key={canal}
                    className={canalNuevaAtencion === canal ? 'seleccionado' : ''}
                    onClick={() => setCanalNuevaAtencion(canal)}>
                    {canal}
                  </button>
                ))}
              </div>
              <button className="btn-principal" disabled={!canalNuevaAtencion} onClick={iniciarAtencion}>
                + Nueva atención
              </button>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: '1rem' }}>
              Historial de interacciones
            </h3>

            {totalInteracciones === 0 && <p className="p2-sin-feed">Aún no hay interacciones registradas.</p>}

            {interaccionesPaginadas.map((i) => (
              <div className="feed-item" key={i.id}>
                <div className="fila-superior">
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-brown-700)' }}>
                    {formatearFecha(i.fecha)} · {i.canal}
                  </span>
                  <span className={`estado-badge ${i.estado}`}>{i.estado.replace('_', ' ')}</span>
                </div>
                <div>{i.resumenPedido || 'Sin resumen registrado'}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-brown-700)' }}>
                  Atendido por {i.colaborador?.nombre}
                  {i.montoSoles !== null && ` · S/${i.montoSoles}`}
                  {i.satisfaccion && ` · ${i.satisfaccion === 'SATISFECHO' ? '😊' : i.satisfaccion === 'NEUTRO' ? '😐' : '😞'} ${i.satisfaccion}`}
                </div>
              </div>
            ))}

            {hayMas && (
              <button className="btn-secundario" style={{ marginTop: 12, width: '100%' }}
                onClick={() => setPaginaFeed((p) => p + 1)}>
                Ver más ({totalInteracciones - paginaFeed * ITEMS_POR_PAGINA} restantes)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
