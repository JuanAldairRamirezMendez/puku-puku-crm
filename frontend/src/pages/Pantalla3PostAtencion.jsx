import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const ICONOS = [
  { valor: 'SATISFECHO', icono: '😊', etiqueta: 'Satisfecho' },
  { valor: 'NEUTRO', icono: '😐', etiqueta: 'Neutro' },
  { valor: 'INSATISFECHO', icono: '😞', etiqueta: 'Insatisfecho' },
];

const META_CIERRE_SEG = 45;

// Traduce errores del backend a lenguaje operativo del local; conserva lo ya capturado en el modal.
function mensajeApiAmigable(mensajeCrudo) {
  if (!mensajeCrudo) return 'Ocurrió un error inesperado. Intenta de nuevo.';

  if (/Interacción no encontrada|no existe/i.test(mensajeCrudo)) {
    return 'No se encontró la atención a cerrar. Recarga la pantalla e intenta otra vez.';
  }
  if (/Cliente no encontrado/i.test(mensajeCrudo)) {
    return 'No se encontró el cliente asociado a esta atención.';
  }
  if (/Error interno del servidor/i.test(mensajeCrudo)) {
    return 'Hubo un problema en el servidor. Intenta registrar de nuevo en unos segundos.';
  }
  if (/Error \d+ al consultar/i.test(mensajeCrudo)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta otra vez.';
  }
  return mensajeCrudo;
}

export default function Pantalla3PostAtencion({ interaccion, clienteNombre, onCerrar, onCancelar }) {
  const [resumenPedido, setResumenPedido] = useState('');
  const [montoSoles, setMontoSoles] = useState('');
  const [actualizoPreferencia, setActualizoPreferencia] = useState(false);
  const [productoFavoritoNuevo, setProductoFavoritoNuevo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [satisfaccion, setSatisfaccion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);

  const modalRef = useRef(null);
  const tituloId = 'modal-cierre-titulo';

  // Contador visible desde la apertura del modal para verificar el objetivo ≤45 s en campo.
  useEffect(() => {
    const inicio = Date.now();
    const intervalo = setInterval(() => {
      setSegundosTranscurridos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Enfoca el primer campo al abrir y permite cerrar con Escape (operable sin mouse).
  useEffect(() => {
    const primerCampo = modalRef.current?.querySelector('#resumen');
    primerCampo?.focus();

    function handleEscape(e) {
      if (e.key === 'Escape' && !guardando) onCancelar();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [guardando, onCancelar]);

  async function handleRegistrar(e) {
    e?.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api.cerrarInteraccion(interaccion.id, {
        resumenPedido,
        montoSoles: montoSoles ? Number(montoSoles) : null,
        actualizoPreferencia,
        productoFavoritoNuevo: actualizoPreferencia ? productoFavoritoNuevo : undefined,
        observacion,
        satisfaccion: satisfaccion || null,
      });
      onCerrar();
    } catch (err) {
      setError(mensajeApiAmigable(err.message));
    } finally {
      setGuardando(false);
    }
  }

  function handleSatisfaccionKeyDown(e, valor) {
    const idx = ICONOS.findIndex((i) => i.valor === valor);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSatisfaccion(ICONOS[(idx + 1) % ICONOS.length].valor);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSatisfaccion(ICONOS[(idx - 1 + ICONOS.length) % ICONOS.length].valor);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setSatisfaccion(valor);
    }
  }

  const excedeMeta = segundosTranscurridos > META_CIERRE_SEG;

  return (
    <div className="overlay-modal" role="presentation">
      <div
        className="modal-cierre"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h2 id={tituloId} style={{ fontFamily: 'var(--font-display)', marginTop: 0, flex: 1 }}>
            Cerrar atención — {clienteNombre}
          </h2>
          <div
            role="timer"
            aria-live="polite"
            aria-label={`Tiempo transcurrido: ${segundosTranscurridos} segundos. Meta: ${META_CIERRE_SEG} segundos.`}
            style={{
              flexShrink: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: excedeMeta ? 'var(--color-danger)' : 'var(--color-terracotta)',
              background: excedeMeta ? '#fbeae8' : 'var(--color-sand)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              whiteSpace: 'nowrap',
            }}
          >
            {segundosTranscurridos}s
            {excedeMeta && ' · +45s'}
          </div>
        </div>

        {error && (
          <div className="error-msg" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleRegistrar}>
          <div className="campo">
            <label htmlFor="resumen">Resumen del pedido</label>
            <input
              id="resumen"
              value={resumenPedido}
              onChange={(e) => setResumenPedido(e.target.value)}
              placeholder="Ej. Flat white + torta de mango"
            />
          </div>

          <div className="campo">
            <label htmlFor="monto">Monto (S/)</label>
            <input
              id="monto"
              type="number"
              min="0"
              step="0.5"
              value={montoSoles}
              onChange={(e) => setMontoSoles(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="toggle-row">
            <label htmlFor="toggle-preferencia" style={{ cursor: 'pointer' }}>
              ¿Actualizar producto favorito?
            </label>
            <input
              id="toggle-preferencia"
              type="checkbox"
              checked={actualizoPreferencia}
              onChange={(e) => setActualizoPreferencia(e.target.checked)}
            />
          </div>

          {actualizoPreferencia && (
            <div className="campo">
              <label htmlFor="nuevoFavorito">Nuevo producto favorito</label>
              <input
                id="nuevoFavorito"
                value={productoFavoritoNuevo}
                onChange={(e) => setProductoFavoritoNuevo(e.target.value)}
              />
            </div>
          )}

          <div className="campo">
            <label htmlFor="observacion">Observación (opcional)</label>
            <textarea
              id="observacion"
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Comentario adicional para el siguiente turno"
            />
          </div>

          <div className="campo">
            <span id="satisfaccion-etiqueta" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brown-700)', marginBottom: 6 }}>
              Satisfacción del cliente
            </span>
            <div
              className="iconos-satisfaccion"
              role="radiogroup"
              aria-labelledby="satisfaccion-etiqueta"
            >
              {ICONOS.map(({ valor, icono, etiqueta }) => (
                <button
                  type="button"
                  key={valor}
                  className={satisfaccion === valor ? 'seleccionado' : ''}
                  role="radio"
                  aria-checked={satisfaccion === valor}
                  aria-label={etiqueta}
                  onClick={() => setSatisfaccion(valor)}
                  onKeyDown={(e) => handleSatisfaccionKeyDown(e, valor)}
                >
                  {icono}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn-secundario" type="button" onClick={onCancelar} disabled={guardando}>
              Cancelar
            </button>
            <button className="btn-principal" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Registrar atención'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
