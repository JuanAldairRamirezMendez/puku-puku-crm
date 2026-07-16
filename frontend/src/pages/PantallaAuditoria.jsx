import { useEffect, useState } from 'react';

const ACCIONES = ['', 'USUARIO.LOGIN', 'CLIENTE.CREAR', 'INTERACCION.CERRAR'];
const BASE = import.meta.env.VITE_API_URL || '/api';

export default function PantallaAuditoria() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');

  async function cargar(p, accion) {
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (accion) params.set('accion', accion);
      const res = await fetch(`${BASE}/audit?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.data);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar(pagina, filtro);
  }, [pagina, filtro]);

  function formatearFecha(iso) {
    return new Date(iso).toLocaleString('es-PE');
  }

  return (
    <div>
      <h1 className="titulo-pantalla">Auditoría</h1>
      <p className="subtitulo-pantalla">
        Registro de acciones del panel (Ley N.° 29733). Solo visible para administradores.
      </p>

      {error && <div className="error-msg">{error}</div>}

      <div className="campo" style={{ maxWidth: 300, marginBottom: 16 }}>
        <label htmlFor="filtro-accion">Filtrar por acción</label>
        <select id="filtro-accion" value={filtro} onChange={(e) => { setFiltro(e.target.value); setPagina(1); }}>
          {ACCIONES.map((a) => (
            <option key={a} value={a}>{a || 'Todas'}</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', marginBottom: 12 }}>
        {total} registro(s)
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {logs.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-brown-700)' }}>Sin registros de auditoría.</p>
        )}

        {logs.map((log) => {
          let detalle = {};
          try { detalle = JSON.parse(log.detalle || '{}'); } catch {}
          return (
            <div key={log.id} className="feed-item" style={{ fontSize: '0.82rem' }}>
              <div className="fila-superior">
                <strong style={{ fontSize: '0.78rem' }}>{log.accion}</strong>
                <span style={{ color: 'var(--color-brown-700)', fontSize: '0.75rem' }}>
                  {formatearFecha(log.createdAt)}
                </span>
              </div>
              <div style={{ color: 'var(--color-brown-700)' }}>
                Usuario: {log.usuarioId || '—'} · IP: {log.ip || '—'}
              </div>
              {detalle.statusCode && (
                <div style={{ color: detalle.statusCode >= 400 ? 'var(--color-danger)' : 'var(--color-brown-700)' }}>
                  {detalle.metodo} {detalle.ruta} → {detalle.statusCode}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button className="btn-secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            ← Anterior
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--color-brown-700)' }}>
            Pág. {pagina}
          </span>
          <button className="btn-secundario" disabled={pagina * 20 >= total} onClick={() => setPagina((p) => p + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
