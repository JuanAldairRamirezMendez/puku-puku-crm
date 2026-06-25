import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Pantalla3PostAtencion from './Pantalla3PostAtencion.jsx';

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];

function formatearFecha(fechaISO) {
  return new Date(fechaISO).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Pantalla2Historial({ clienteId, onVolver }) {
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState('');
  const [canalNuevaAtencion, setCanalNuevaAtencion] = useState('');
  const [interaccionEnCurso, setInteraccionEnCurso] = useState(null);

  async function cargarCliente() {
    try {
      const data = await api.obtenerCliente(clienteId);
      setCliente(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarCliente();
  }, [clienteId]);

  async function iniciarAtencion() {
    if (!canalNuevaAtencion) return;
    try {
      const interaccion = await api.crearInteraccion(clienteId, { canal: canalNuevaAtencion });
      setInteraccionEnCurso(interaccion);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCierreCompletado() {
    setInteraccionEnCurso(null);
    setCanalNuevaAtencion('');
    await cargarCliente();
  }

  if (error) return <div className="error-msg">{error}</div>;
  if (!cliente) return <p>Cargando…</p>;

  const iniciales = cliente.nombreCompleto
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <div>
      <button className="btn-secundario" onClick={onVolver} style={{ marginBottom: 16 }}>
        ← Volver a búsqueda
      </button>

      <div className="layout-cliente">
        {/* Tarjeta de cliente */}
        <div className="card">
          <div className="avatar-circulo">{iniciales}</div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: '12px 0 4px' }}>
            {cliente.nombreCompleto}
          </h2>
          <p style={{ color: 'var(--color-brown-700)', fontSize: '0.85rem', margin: '0 0 10px' }}>
            {cliente.telefono}
          </p>
          <span className="etiqueta-canal">{cliente.canalOrigen}</span>

          <p style={{ fontSize: '0.85rem', marginTop: 14 }}>
            <strong>Producto favorito:</strong> {cliente.productoFavorito || '—'}
          </p>
          {cliente.restriccionesAlergias && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>
              ⚠ Alergias: {cliente.restriccionesAlergias}
            </p>
          )}

          <div className="metricas-rapidas">
            <div className="metrica">
              <div className="valor">{cliente.metricas.frecuenciaVisita}</div>
              <div className="etiqueta">Visitas</div>
            </div>
            <div className="metrica">
              <div className="valor">S/{cliente.metricas.ticketPromedioSoles}</div>
              <div className="etiqueta">Ticket prom.</div>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="canal-selector" style={{ flex: 1 }}>
              {CANALES.map((canal) => (
                <button
                  key={canal}
                  className={canalNuevaAtencion === canal ? 'seleccionado' : ''}
                  onClick={() => setCanalNuevaAtencion(canal)}
                >
                  {canal}
                </button>
              ))}
            </div>
            <button
              className="btn-principal"
              disabled={!canalNuevaAtencion}
              onClick={iniciarAtencion}
            >
              + Nueva atención
            </button>
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>
            Historial de interacciones
          </h3>

          {cliente.interacciones.length === 0 && <p>Aún no hay interacciones registradas.</p>}

          {cliente.interacciones.map((i) => (
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {interaccionEnCurso && (
        <Pantalla3PostAtencion
          interaccion={interaccionEnCurso}
          clienteNombre={cliente.nombreCompleto}
          onCerrar={handleCierreCompletado}
          onCancelar={() => setInteraccionEnCurso(null)}
        />
      )}
    </div>
  );
}
