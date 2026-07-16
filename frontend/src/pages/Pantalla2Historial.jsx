import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Pantalla3PostAtencion from './Pantalla3PostAtencion.jsx';
import { SkeletonSidebar, SkeletonCard } from '../components/Skeleton.jsx';

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

export default function Pantalla2Historial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [canalNuevaAtencion, setCanalNuevaAtencion] = useState('');
  const [interaccionEnCurso, setInteraccionEnCurso] = useState(null);
  const [paginaFeed, setPaginaFeed] = useState(1);
  const [mlPrediccion, setMlPrediccion] = useState(null);
  const [mlCargando, setMlCargando] = useState(false);

  async function cargarCliente() {
    if (!id) return;
    setCargando(true);
    try {
      const data = await api.obtenerCliente(id);
      setCliente(data);
      setPaginaFeed(1);
      cargarMlPrediccion(id);
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }

  async function cargarMlPrediccion(clienteId) {
    setMlCargando(true);
    try {
      const data = await api.predecirChurnCliente(clienteId);
      setMlPrediccion(data);
    } catch {
      setMlPrediccion(null);
    } finally {
      setMlCargando(false);
    }
  }

  useEffect(() => { cargarCliente(); }, [id]);

  async function iniciarAtencion() {
    if (!canalNuevaAtencion || !id) return;
    try {
      const interaccion = await api.crearInteraccion(id, { canal: canalNuevaAtencion });
      setInteraccionEnCurso(interaccion);
    } catch (err) { setError(err.message); }
  }

  async function handleCierreCompletado() {
    setInteraccionEnCurso(null);
    setCanalNuevaAtencion('');
    await cargarCliente();
  }

  const churnAnalysis = useMemo(() => {
    if (!cliente) return null;
    const ints = cliente.interacciones;
    const n = ints.length;
    const ultima = ints[0]?.fecha;
    const diffDias = ultima ? diasDesde(ultima) : 999;
    const churnLabel = !ultima || diffDias > 30 ? 1 : 0;
    const score = cliente.metricas?.churnScore ?? 0;
    const nivel = score < 0.33 ? 'bajo' : score < 0.66 ? 'medio' : 'alto';

    const mlScore = cliente.metricas?.mlScore ?? null;
    const mlNivel = mlScore !== null ? (mlScore < 0.33 ? 'bajo' : mlScore < 0.66 ? 'medio' : 'alto') : null;
    const mlTopFactores = cliente.metricas?.mlTopFactores ?? [];

    const displayScore = mlScore ?? score;
    const displayNivel = mlNivel ?? nivel;

    const factores = [];

    if (mlTopFactores.length > 0) {
      for (const f of mlTopFactores.slice(0, 3)) {
        const nombresFactor = {
          recency_dias: 'Días desde última visita',
          freq_semanal: 'Frecuencia semanal',
          freq_total: 'Visitas totales',
          ticket_promedio: 'Ticket promedio',
          ticket_total: 'Gasto total',
          ticket_max: 'Ticket máximo',
          ticket_trend: 'Tendencia de gasto',
          diversidad_canal: 'Diversidad de canales',
          pct_insatisfecho: 'Insatisfacción general',
          pct_insatisfecho_reciente: 'Insatisfacción reciente',
          regularidad: 'Regularidad de visitas',
          gap_mean: 'Intervalo promedio',
          night_ratio: 'Horario nocturno',
        };
        factores.push({
          icono: '🤖',
          texto: `${nombresFactor[f.nombre] || f.nombre}: ${f.valor}`,
          severidad: f.valor > 0.5 ? 'alta' : f.valor > 0.2 ? 'media' : 'baja',
        });
      }
    }

    if (mlTopFactores.length === 0) {
      if (ultima) {
        factores.push({
          icono: '🕐',
          texto: `${diffDias} días sin visitar`,
          severidad: diffDias > 30 ? 'alta' : diffDias > 14 ? 'media' : 'baja',
        });
      } else {
        factores.push({ icono: '🕐', texto: 'Sin visitas registradas', severidad: 'alta' });
      }

      const freqRiesgo = Math.max(0, 1 - n / 20);
      factores.push({
        icono: '📊',
        texto: `${n} visitas en total${n < 3 ? ' — muy pocas para generar hábito' : n < 6 ? ' — ritmo moderado' : ' — buena consistencia'}`,
        severidad: freqRiesgo > 0.5 ? 'alta' : freqRiesgo > 0.2 ? 'media' : 'baja',
      });

      const canales = new Set(ints.map((i) => i.canal));
      if (canales.size === 1 && n > 1) {
        factores.push({
          icono: '📱',
          texto: `Canal único: ${[...canales][0]} — sin diversificación de contacto`,
          severidad: 'media',
        });
      }

      const recientes90 = ints.filter((i) => diasDesde(i.fecha) <= 90);
      const insatisfechos = recientes90.filter((i) => i.satisfaccion === 'INSATISFECHO').length;
      if (insatisfechos > 0) {
        factores.push({
          icono: '😞',
          texto: `${insatisfechos} atención(es) insatisfactoria(s) en los últimos 90 días`,
          severidad: 'alta',
        });
      }
    }

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

    let accion = '';
    if (mlScore !== null && mlScore > 0.7) {
      const topFactor = mlTopFactores[0];
      if (topFactor?.nombre === 'recency_dias') {
        accion = `ML detecta alto riesgo por inactividad. Enviar cupón de descuento por ${cliente.canalOrigen || 'WhatsApp'} para recuperar al cliente.`;
      } else if (topFactor?.nombre?.includes('insatisfecho')) {
        accion = `ML detecta insatisfacción como factor principal. Priorizar atención personalizada para resolver quejas.`;
      } else {
        accion = `ML predice ${(mlScore * 100).toFixed(0)}% de riesgo. Aplicar programa de fidelización urgente.`;
      }
    } else if (churnLabel === 1 && ultima) {
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
      score: displayScore, nivel: displayNivel, churnLabel, diffDias, n,
      factores: factores.slice(0, 5),
      semanas,
      accion,
      tendencia: puntajeAnterior >= 0 ? `${score > puntajeAnterior ? 'sube' : 'baja'} vs mes anterior` : null,
      diffPts: Math.round(Math.abs(score - puntajeAnterior) * 100),
      esML: mlScore !== null,
    };
  }, [cliente]);

  if (error) return <div className="error-msg">{error}</div>;

  if (cargando || !cliente) {
    return (
      <div>
        <button className="btn-secundario" onClick={() => navigate('/buscar')} style={{ marginBottom: 16 }}>← Volver a búsqueda</button>
        <div className="p2-layout">
          <SkeletonSidebar />
          <SkeletonCard lines={5} height="300px" />
        </div>
      </div>
    );
  }

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
      <button className="btn-secundario" onClick={() => navigate('/buscar')} style={{ marginBottom: 16 }}>← Volver a búsqueda</button>

      {interaccionEnCurso && (
        <Pantalla3PostAtencion
          interaccion={interaccionEnCurso}
          clienteNombre={cliente.nombreCompleto}
          onCerrar={handleCierreCompletado}
          onCancelar={() => setInteraccionEnCurso(null)}
        />
      )}

      <div className="p2-layout">
        <aside className="p2-sidebar">
          <div className="p2-sb-header">
            <div className="p2-avatar">{iniciales}</div>
            <h2 className="p2-sb-nombre">{cliente.nombreCompleto}</h2>
            <p className="p2-sb-telefono">{cliente.telefono}</p>
            <span className="etiqueta-canal">{cliente.canalOrigen}</span>
          </div>

          {cliente.productoFavorito && (
            <div className="p2-sb-chip">{cliente.productoFavorito}</div>
          )}

          <div className="p2-sb-seccion">
            <div className="p2-sb-sec-titulo">Predicción ML (APF3)</div>
            {mlCargando ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-brown-700)' }}>Cargando predicción ML...</p>
            ) : mlPrediccion && !mlPrediccion.error ? (
              <div>
                <div className="p2-churn-header">
                  <span className={`p2-churn-pct nivel-${mlPrediccion.probabilidad_churn < 0.33 ? 'bajo' : mlPrediccion.probabilidad_churn < 0.66 ? 'medio' : 'alto'}`}>
                    {(mlPrediccion.probabilidad_churn * 100).toFixed(0)}%
                  </span>
                  <div className="p2-churn-bar-track">
                    <div className={`p2-churn-bar-fill nivel-${mlPrediccion.probabilidad_churn < 0.33 ? 'bajo' : mlPrediccion.probabilidad_churn < 0.66 ? 'medio' : 'alto'}`}
                      style={{ width: `${(mlPrediccion.probabilidad_churn * 100).toFixed(0)}%` }} />
                  </div>
                </div>
                <p className="p2-churn-contexto">
                  {mlPrediccion.churn_etiqueta === 'RIESGO_ABANDONO'
                    ? 'Riesgo de abandono (ML)'
                    : 'Cliente activo (ML)'}
                  {' · Modelo: Regresión Logística'}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-brown-700)' }}>
                Modelo ML no disponible. Entrena el modelo en Analytics.
              </p>
            )}
          </div>

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
                {churnAnalysis.esML && <span className="p2-chip-ml"> ML</span>}
                {churnAnalysis.tendencia && ` · ${churnAnalysis.tendencia} (+${churnAnalysis.diffPts} pts)`}
              </p>
            </div>
          )}

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

          {intervaloPromedio !== null && (
            <p className="p2-sb-detalle">Intervalo promedio entre visitas: cada {intervaloPromedio} días</p>
          )}
          {cliente.restriccionesAlergias && (
            <p className="p2-sb-detalle" style={{ color: 'var(--color-danger)' }}>
              ⚠ Alergias: {cliente.restriccionesAlergias}
            </p>
          )}

          {churnAnalysis && (
            <div className="p2-accion">
              <span className="p2-accion-icono">💡</span>
              <span className="p2-accion-texto">{churnAnalysis.accion}</span>
            </div>
          )}
        </aside>

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
