import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { SkeletonKPI, SkeletonSearchResult } from '../components/Skeleton.jsx';

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];
const STORAGE_KEY = 'puku_recientes';

function mensajeApiAmigable(mensajeCrudo) {
  if (!mensajeCrudo) return 'Ocurrió un error inesperado. Intenta de nuevo.';
  if (/valor único.*telefono|telefono.*único|P2002/i.test(mensajeCrudo))
    return 'Ya existe un cliente con ese teléfono. Verifica el número o búscalo en la lista.';
  if (/nombreCompleto, telefono y canalOrigen/i.test(mensajeCrudo))
    return 'Completa nombre, teléfono y canal de origen antes de guardar.';
  if (/29733|consentimiento/i.test(mensajeCrudo))
    return 'Debes marcar el consentimiento de la Ley N.° 29733 para registrar al cliente.';
  if (/Cliente no encontrado/i.test(mensajeCrudo))
    return 'No se encontró ese cliente. Intenta buscar de nuevo.';
  if (/Error interno del servidor/i.test(mensajeCrudo))
    return 'Hubo un problema en el servidor. Intenta de nuevo en unos segundos.';
  if (/Error \d+ al consultar/i.test(mensajeCrudo))
    return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta otra vez.';
  return mensajeCrudo;
}

function evaluarTelefono(valor) {
  const limpio = valor.replace(/\s/g, '');
  if (!limpio) return { valido: false, mensaje: '', incompleto: true };
  const patronCompleto = /^\+519\d{8}$/;
  if (patronCompleto.test(limpio)) return { valido: true, mensaje: '', incompleto: false };
  const patronParcial = /^(\+|\+\d{0,2}|\+51\d{0,9})$/;
  if (patronParcial.test(limpio)) return { valido: false, mensaje: '', incompleto: true };
  return { valido: false, incompleto: false, mensaje: 'Formato esperado: +51 9XXXXXXXX (celular peruano de 9 dígitos).' };
}

function cargarRecientes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function guardarReciente(cliente) {
  const recientes = cargarRecientes().filter((r) => r.id !== cliente.id);
  recientes.unshift({ id: cliente.id, nombre: cliente.nombreCompleto, telefono: cliente.telefono, canal: cliente.canalOrigen });
  if (recientes.length > 6) recientes.length = 6;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recientes));
}

const SEARCH_QUERY_KEY = 'puku_search_query';
const SEARCH_RESULTS_KEY = 'puku_search_results';

export default function Pantalla1Registro() {
  const navigate = useNavigate();
  const [query, setQuery] = useState(() => sessionStorage.getItem(SEARCH_QUERY_KEY) || '');
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [resultados, setResultados] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SEARCH_RESULTS_KEY) || '[]'); } catch { return []; }
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [frecuentesCount, setFrecuentesCount] = useState(null);
  const [recientes, setRecientes] = useState(cargarRecientes);

  const [form, setForm] = useState({
    nombreCompleto: '',
    telefono: '',
    canalOrigen: '',
    productoFavorito: '',
    restriccionesAlergias: '',
    consentimientoLey29733: false,
  });

  const telefonoEval = evaluarTelefono(form.telefono);
  const telefonoTocado = form.telefono.length > 0;

  useEffect(() => {
    sessionStorage.setItem(SEARCH_QUERY_KEY, query);
    sessionStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(resultados));
  }, [query, resultados]);

  useEffect(() => {
    api.analytics().then(setAnalyticsData).catch(() => {});
    api.clientesFrecuentes(2).then((d) => setFrecuentesCount(d.total)).catch(() => {});
  }, []);

  async function handleBuscar(valor) {
    setQuery(valor);
    setError('');
    if (valor.trim().length < 2) { setResultados([]); return; }
    setCargandoBusqueda(true);
    try {
      const res = await api.buscarClientes(valor);
      setResultados(res.data || res);
    } catch (err) { setError(mensajeApiAmigable(err.message)); }
    finally { setCargandoBusqueda(false); }
  }

  async function handleRegistrar(e) {
    e.preventDefault();
    setError('');
    if (!telefonoEval.valido) { setError('Revisa el teléfono: debe tener el formato +51 9XXXXXXXX.'); return; }
    try {
      const cliente = await api.crearCliente(form);
      guardarReciente(cliente);
      navigate(`/cliente/${cliente.id}`);
    } catch (err) { setError(mensajeApiAmigable(err.message)); }
  }

  function seleccionarCliente(cliente) {
    guardarReciente(cliente);
    setRecientes(cargarRecientes());
    navigate(`/cliente/${cliente.id}`);
  }

  function seleccionarCanal(canal) { setForm({ ...form, canalOrigen: canal }); }

  function handleCanalKeyDown(e, canal) {
    const idx = CANALES.indexOf(canal);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); seleccionarCanal(CANALES[(idx + 1) % CANALES.length]); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); seleccionarCanal(CANALES[(idx - 1 + CANALES.length) % CANALES.length]); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); seleccionarCanal(canal); }
  }

  const puedeGuardar = form.consentimientoLey29733 && form.canalOrigen && telefonoEval.valido;
  const hoy = analyticsData?.tendencia?.at(-1)?.count ?? null;
  const totalClientes = analyticsData?.resumen?.totalClientes ?? null;

  return (
    <div className="p1-container">
      <h1 className="p1-titulo">Búsqueda y registro inicial</h1>
      <p className="p1-subtitulo">
        Busca por nombre o teléfono. Si el cliente no existe, regístralo en menos de 30 segundos.
      </p>

      {error && <div className="error-msg" role="alert" aria-live="polite">{error}</div>}

      {/* KPIs */}
      <div className="p1-kpis">
        {analyticsData ? (
          <>
            <div className="p1-kpi-card">
              <span className="p1-kpi-num">{hoy !== null ? hoy : '—'}</span>
              <span className="p1-kpi-label">CLIENTES HOY</span>
            </div>
            <div className="p1-kpi-card">
              <span className="p1-kpi-num">{frecuentesCount !== null ? frecuentesCount : '—'}</span>
              <span className="p1-kpi-label">FRECUENTES ACTIVOS</span>
            </div>
            <div className="p1-kpi-card">
              <span className="p1-kpi-num">{totalClientes !== null ? totalClientes : '—'}</span>
              <span className="p1-kpi-label">TOTAL CLIENTES</span>
            </div>
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => <SkeletonKPI key={i} />)
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="p1-search-wrapper">
        <svg className="p1-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A7863" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="p1-search-input"
          type="search"
          aria-label="Buscar cliente por nombre o teléfono"
          placeholder="Buscar cliente por nombre o teléfono…"
          value={query}
          onChange={(e) => handleBuscar(e.target.value)}
        />
      </div>

      {/* Recientes (solo cuando no hay query) */}
      {query.trim().length < 2 && recientes.length > 0 && (
        <div className="p1-recientes">
          <span className="p1-recientes-label">Búsquedas recientes</span>
          <div className="p1-recientes-chips">
            {recientes.map((r) => (
              <button key={r.id} className="p1-chip" type="button" onClick={() => seleccionarCliente(r)}>
                {r.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {cargandoBusqueda && (
        <div className="card" style={{ marginTop: 16, padding: 12 }}>
          <SkeletonSearchResult />
          <SkeletonSearchResult />
          <SkeletonSearchResult />
        </div>
      )}

      {!cargandoBusqueda && resultados.length > 0 && (
        <div className="card" style={{ marginTop: 16, padding: 0 }} role="listbox" aria-label="Resultados de búsqueda">
          {resultados.map((cliente) => (
            <button
              type="button" key={cliente.id} className="resultado-item" role="option"
              style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', font: 'inherit' }}
              onClick={() => seleccionarCliente(cliente)}
            >
              <strong>{cliente.nombreCompleto}</strong>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: 'var(--color-brown-700)', fontSize: '0.85rem' }}>{cliente.telefono}</span>
                <span className="etiqueta-canal">{cliente.canalOrigen}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* CTA contextual — registro */}
      {query.trim().length >= 2 && resultados.length === 0 && !mostrarFormulario && (
        <div className="p1-cta">
          <div className="p1-cta-icono">+</div>
          <div className="p1-cta-texto">
            <strong>¿No encuentras al cliente?</strong>
            <span>Regístralo en menos de 30 segundos</span>
          </div>
          <button className="p1-cta-btn" type="button" onClick={() => setMostrarFormulario(true)}>
            Registrar nuevo
          </button>
        </div>
      )}

      {/* Formulario de registro */}
      {mostrarFormulario && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: '1.15rem' }}>Registro de nuevo cliente</h2>
          <form onSubmit={handleRegistrar} noValidate>
            <div className="campo">
              <label htmlFor="nombreCompleto">Nombre completo</label>
              <input id="nombreCompleto" value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                placeholder="Ej. Ana Torres Quispe" required autoComplete="name" />
            </div>
            <div className="campo">
              <label htmlFor="telefono">Teléfono / WhatsApp</label>
              <input id="telefono" type="tel" inputMode="tel" value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+51 9XX XXX XXX" required autoComplete="tel"
                aria-invalid={telefonoTocado && !telefonoEval.valido && !telefonoEval.incompleto}
                aria-describedby="telefono-ayuda"
                style={telefonoTocado && !telefonoEval.valido && !telefonoEval.incompleto ? { borderColor: 'var(--color-danger)' } : undefined} />
              <p id="telefono-ayuda" style={{
                margin: '6px 0 0', fontSize: '0.82rem',
                color: telefonoTocado && telefonoEval.valido ? 'var(--color-success)' : telefonoTocado && telefonoEval.mensaje ? 'var(--color-danger)' : 'var(--color-brown-700)',
              }}>
                {telefonoTocado && telefonoEval.valido ? '✓ Formato válido' : telefonoEval.mensaje || 'Ejemplo: +51 912345678'}
              </p>
            </div>
            <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brown-700)', marginBottom: 6 }}>Canal de origen</legend>
              <div className="canal-selector" role="group" aria-label="Canal de origen">
                {CANALES.map((canal) => (
                  <button type="button" key={canal}
                    className={form.canalOrigen === canal ? 'seleccionado' : ''}
                    aria-pressed={form.canalOrigen === canal}
                    onClick={() => seleccionarCanal(canal)}
                    onKeyDown={(e) => handleCanalKeyDown(e, canal)}>
                    {canal}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="campo">
              <label htmlFor="productoFavorito">Producto favorito</label>
              <input id="productoFavorito" value={form.productoFavorito}
                onChange={(e) => setForm({ ...form, productoFavorito: e.target.value })}
                placeholder="Ej. Flat white sin azúcar" />
            </div>
            <div className="campo">
              <label htmlFor="restricciones">Restricciones o alergias</label>
              <textarea id="restricciones" rows={2} value={form.restriccionesAlergias}
                onChange={(e) => setForm({ ...form, restriccionesAlergias: e.target.value })}
                placeholder="Ej. Intolerante a la lactosa" />
            </div>
            <label className="consentimiento" htmlFor="consentimiento">
              <input id="consentimiento" type="checkbox" checked={form.consentimientoLey29733}
                onChange={(e) => setForm({ ...form, consentimientoLey29733: e.target.checked })} />
              <span>El cliente autoriza el uso de sus datos personales conforme a la Ley N.° 29733 de Protección de Datos Personales.</span>
            </label>
            <button className="btn-principal" type="submit" disabled={!puedeGuardar}>Guardar cliente</button>
          </form>
        </div>
      )}

      {!mostrarFormulario && query.trim().length < 2 && (
        <div className="p1-cta" style={{ marginTop: 24 }}>
          <div className="p1-cta-icono">+</div>
          <div className="p1-cta-texto">
            <strong>¿No encuentras al cliente?</strong>
            <span>Regístralo en menos de 30 segundos</span>
          </div>
          <button className="p1-cta-btn" type="button" onClick={() => setMostrarFormulario(true)}>
            Registrar nuevo
          </button>
        </div>
      )}
    </div>
  );
}
