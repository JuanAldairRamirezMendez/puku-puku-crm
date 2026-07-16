import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';

export default function PantallaFeatureStore() {
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({ name: '', description: '', category: 'behavioral', dataType: 'numeric' });
  const [showForm, setShowForm] = useState(false);

  async function cargar() {
    try {
      const res = await fetch(`${BASE}/feature-store`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeatures(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function handleCrear(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE}/feature-store`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      setNuevo({ name: '', description: '', category: 'behavioral', dataType: 'numeric' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="titulo-pantalla">Feature Store</h1>
          <p className="subtitulo-pantalla">
            Catalogo centralizado de features del ML pipeline. Cada feature se genera automaticamente desde <code>train.py</code>.
          </p>
        </div>
        <button className="btn-principal" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.82rem' }}>
          {showForm ? 'Cancelar' : '+ Nueva feature'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={handleCrear} style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Nombre</label>
              <input required value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })} />
            </div>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Categoria</label>
              <select value={nuevo.category} onChange={(e) => setNuevo({ ...nuevo, category: e.target.value })}>
                <option value="behavioral">Behavioral</option>
                <option value="monetary">Monetary</option>
                <option value="temporal">Temporal</option>
                <option value="demographic">Demographic</option>
                <option value="channel">Channel</option>
              </select>
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <label>Descripcion</label>
              <input value={nuevo.description} onChange={(e) => setNuevo({ ...nuevo, description: e.target.value })} />
            </div>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Tipo de dato</label>
              <select value={nuevo.dataType} onChange={(e) => setNuevo({ ...nuevo, dataType: e.target.value })}>
                <option value="numeric">Numerico</option>
                <option value="categorical">Categorico</option>
                <option value="boolean">Booleano</option>
              </select>
            </div>
            <button type="submit" className="btn-principal" style={{ alignSelf: 'end' }}>Guardar</button>
          </form>
        </div>
      )}

      <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', marginBottom: 12 }}>
        {features.length} feature(s) registradas
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {features.length === 0 && <p style={{ padding: 16 }}>Sin features registradas.</p>}
        {features.map((f) => (
          <div key={f.id} className="feed-item">
            <div className="fila-superior">
              <strong>{f.name}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-brown-700)' }}>
                <span className={`badge badge-${f.category}`}>{f.category}</span> · {f.dataType}
              </span>
            </div>
            {f.description && <div style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)' }}>{f.description}</div>}
            <div style={{ fontSize: '0.75rem', color: 'var(--color-brown-600)' }}>
              Fuente: {f.source || '—'} · Creada: {new Date(f.createdAt).toLocaleDateString('es-PE')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
