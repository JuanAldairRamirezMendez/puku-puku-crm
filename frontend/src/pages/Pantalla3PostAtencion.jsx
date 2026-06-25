import { useState } from 'react';
import { api } from '../api/client';

const ICONOS = [
  { valor: 'SATISFECHO', icono: '😊' },
  { valor: 'NEUTRO', icono: '😐' },
  { valor: 'INSATISFECHO', icono: '😞' },
];

export default function Pantalla3PostAtencion({ interaccion, clienteNombre, onCerrar, onCancelar }) {
  const [resumenPedido, setResumenPedido] = useState('');
  const [montoSoles, setMontoSoles] = useState('');
  const [actualizoPreferencia, setActualizoPreferencia] = useState(false);
  const [productoFavoritoNuevo, setProductoFavoritoNuevo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [satisfaccion, setSatisfaccion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleRegistrar() {
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
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="overlay-modal">
      <div className="modal-cierre">
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>
          Cerrar atención — {clienteNombre}
        </h2>

        {error && <div className="error-msg">{error}</div>}

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
          <span>¿Actualizar producto favorito?</span>
          <input
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
          <label>Satisfacción del cliente</label>
          <div className="iconos-satisfaccion">
            {ICONOS.map(({ valor, icono }) => (
              <button
                type="button"
                key={valor}
                className={satisfaccion === valor ? 'seleccionado' : ''}
                onClick={() => setSatisfaccion(valor)}
              >
                {icono}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn-secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn-principal" onClick={handleRegistrar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar atención'}
          </button>
        </div>
      </div>
    </div>
  );
}
