import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function PantallaFrecuentes() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [minVisitas, setMinVisitas] = useState(2);

  async function cargar(min) {
    try {
      const data = await api.clientesFrecuentes(min);
      setDatos(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar(minVisitas);
  }, [minVisitas]);

  return (
    <div>
      <h1 className="titulo-pantalla">Clientes frecuentes</h1>
      <p className="subtitulo-pantalla">
        Reporte de monitoreo de retención (US04) — mismo dataset que alimenta APF3.
      </p>

      {error && <div className="error-msg">{error}</div>}

      <div className="campo" style={{ maxWidth: 240 }}>
        <label htmlFor="minVisitas">Mínimo de visitas</label>
        <input
          id="minVisitas"
          type="number"
          min="1"
          value={minVisitas}
          onChange={(e) => setMinVisitas(Number(e.target.value))}
        />
      </div>

      {datos && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            <strong>{datos.total}</strong> clientes con {minVisitas}+ visitas
          </p>
          {datos.clientes.map((c, idx) => (
            <div className="feed-item" key={idx}>
              <div className="fila-superior">
                <strong>{c.nombre}</strong>
                <span className="etiqueta-canal">{c.canal_origen}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-brown-700)' }}>
                {c.frecuencia_visita} visitas · Ticket prom. S/{c.ticket_promedio_soles} ·{' '}
                Favorito: {c.producto_favorito}
                {c.churn_label === 1 && (
                  <span style={{ color: 'var(--color-danger)' }}> · ⚠ riesgo de abandono</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
