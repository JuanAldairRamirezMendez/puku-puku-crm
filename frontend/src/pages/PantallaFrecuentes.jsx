import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function PantallaFrecuentes() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [minVisitas, setMinVisitas] = useState(2);

  // [TAREA 2] Estado del filtro por canal_origen
  const [canalFiltro, setCanalFiltro] = useState('TODOS');

  // [TAREA 3] Estado del botón de exportación
  const [exportando, setExportando] = useState(false);

  async function cargar(min) {
    try {
      const data = await api.clientesFrecuentes(min);
      setDatos(data);
      // [TAREA 2] Resetear filtro al recargar para no mostrar tabla vacía confusamente
      setCanalFiltro('TODOS');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar(minVisitas);
  }, [minVisitas]);

  // [TAREA 2] Derivar lista de canales únicos presentes en la respuesta actual
  const canalesDisponibles = datos
    ? ['TODOS', ...new Set(datos.clientes.map((c) => c.canal_origen).filter(Boolean))]
    : ['TODOS'];

  // [TAREA 2] Aplicar filtro de canal sobre los clientes recibidos del backend
  const clientesFiltrados =
    datos && canalFiltro !== 'TODOS'
      ? datos.clientes.filter((c) => c.canal_origen === canalFiltro)
      : datos?.clientes ?? [];

  async function handleExportarCSV() {
    setExportando(true);
    try {
      const blob = await api.exportarCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dataset-apf3.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`No se pudo exportar el CSV: ${err.message}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <h1 className="titulo-pantalla">Clientes frecuentes</h1>
          <p className="subtitulo-pantalla">
            Reporte de monitoreo de retención (US04) — mismo dataset que alimenta APF3.
          </p>
        </div>

        {/*
          [TAREA 3] Botón de exportación CSV.
          Dispara GET /api/reportes/export-apf3.csv y descarga el archivo sin redirigir
          al usuario fuera de la pantalla. El equipo de APF3 puede descargar el dataset
          directamente desde aquí sin pedirle el archivo a nadie.
        */}
        <button
          className="btn-principal"
          onClick={handleExportarCSV}
          disabled={exportando}
          style={{ whiteSpace: 'nowrap', alignSelf: 'center' }}
        >
          {exportando ? 'Exportando…' : '⬇ Exportar CSV APF3'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
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

        {/*
          [TAREA 2] Filtro por canal_origen.
          Los canales disponibles se derivan dinámicamente de la respuesta del backend,
          así que funciona con cualquier canal nuevo que se agregue sin tocar este
          componente. El filtro es solo en frontend sobre los datos ya cargados.
        */}
        <div className="campo" style={{ maxWidth: 240 }}>
          <label htmlFor="canalFiltro">Canal de origen</label>
          <select
            id="canalFiltro"
            value={canalFiltro}
            onChange={(e) => setCanalFiltro(e.target.value)}
          >
            {canalesDisponibles.map((canal) => (
              <option key={canal} value={canal}>
                {canal === 'TODOS' ? 'Todos los canales' : canal}
              </option>
            ))}
          </select>
        </div>
      </div>

      {datos && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            <strong>{clientesFiltrados.length}</strong> clientes
            {canalFiltro !== 'TODOS' ? ` vía ${canalFiltro}` : ''} con {minVisitas}+ visitas
            {canalFiltro !== 'TODOS' && datos.total !== clientesFiltrados.length && (
              <span style={{ color: 'var(--color-brown-700)', fontSize: '0.82rem', marginLeft: 6 }}>
                ({datos.total} en total sin filtro)
              </span>
            )}
          </p>

          {clientesFiltrados.length === 0 && (
            <p style={{ color: 'var(--color-brown-700)' }}>
              No hay clientes con {minVisitas}+ visitas
              {canalFiltro !== 'TODOS' ? ` vía ${canalFiltro}` : ''}.
            </p>
          )}

          {clientesFiltrados.map((c, idx) => (
            <div className="feed-item" key={idx}>
              <div className="fila-superior">
                <strong>{c.nombre}</strong>
                <span className="etiqueta-canal">{c.canal_origen}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-brown-700)' }}>
                {c.frecuencia_visita} visitas · Ticket prom. S/{c.ticket_promedio_soles} ·{' '}
                Favorito: {c.producto_favorito}
                {/*
                  [TAREA 1 — referencia] El badge de churn aquí se mantiene igual que antes.
                  El cambio principal de la Tarea 1 está en Pantalla2Historial.jsx donde
                  el indicador aparece en la tarjeta del cliente individual.
                */}
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
