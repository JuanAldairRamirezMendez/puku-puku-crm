import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';
const STATUS_CLASS = { draft: 'badge-draft', running: 'badge-running', completed: 'badge-completed', cancelled: 'badge-cancelled' };

export default function PantallaABTest() {
  const [tests, setTests] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', targetMetric: 'roc_auc', variants: [{ name: 'Control', trafficPct: 50 }, { name: 'Tratamiento', trafficPct: 50 }] });

  async function cargar() {
    try {
      const res = await fetch(`${BASE}/ab-test`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTests(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function handleCrear(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE}/ab-test`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      setForm({ name: '', description: '', targetMetric: 'roc_auc', variants: [{ name: 'Control', trafficPct: 50 }, { name: 'Tratamiento', trafficPct: 50 }] });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleIniciar(id) {
    try {
      await fetch(`${BASE}/ab-test/${id}/iniciar`, { method: 'POST', credentials: 'include' });
      cargar();
    } catch (err) { setError(err.message); }
  }

  async function handleCompletar(id) {
    try {
      await fetch(`${BASE}/ab-test/${id}/completar`, { method: 'POST', credentials: 'include' });
      cargar();
    } catch (err) { setError(err.message); }
  }

  function cambiarVariant(idx, field, val) {
    const v = [...form.variants];
    v[idx] = { ...v[idx], [field]: val };
    setForm({ ...form, variants: v });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="titulo-pantalla">A/B Testing</h1>
          <p className="subtitulo-pantalla">
            Experimentos controlados para comparar modelos, estrategias o configuraciones.
          </p>
        </div>
        <button className="btn-principal" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.82rem' }}>
          {showForm ? 'Cancelar' : '+ Nuevo experimento'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={handleCrear} style={{ display: 'grid', gap: 12 }}>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Nombre del experimento</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Descripcion</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Metrica objetivo</label>
              <select value={form.targetMetric} onChange={(e) => setForm({ ...form, targetMetric: e.target.value })}>
                <option value="roc_auc">ROC-AUC</option>
                <option value="accuracy">Accuracy</option>
                <option value="churn_reduction">Reduccion de churn</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem' }}>Variantes</label>
              {form.variants.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input placeholder="Nombre" value={v.name} onChange={(e) => cambiarVariant(i, 'name', e.target.value)} style={{ flex: 1 }} />
                  <input type="number" placeholder="%" value={v.trafficPct} onChange={(e) => cambiarVariant(i, 'trafficPct', Number(e.target.value))} style={{ width: 70 }} />
                  <small style={{ color: 'var(--color-brown-700)' }}>% trafico</small>
                  {i > 0 && <button type="button" className="btn-secundario" style={{ padding: '4px 8px', fontSize: '0.78rem' }} onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}>X</button>}
                </div>
              ))}
              <button type="button" className="btn-secundario" style={{ fontSize: '0.78rem' }} onClick={() => setForm({ ...form, variants: [...form.variants, { name: '', trafficPct: 0 }] })}>
                + Variante
              </button>
            </div>
            <button type="submit" className="btn-principal">Crear experimento</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {tests.length === 0 && <p style={{ color: 'var(--color-brown-700)' }}>Sin experimentos A/B.</p>}
        {tests.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <strong style={{ fontSize: '0.92rem' }}>{t.name}</strong>
                <span className={`badge ${STATUS_CLASS[t.status] || ''}`} style={{ marginLeft: 8, fontSize: '0.72rem' }}>
                  {t.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {t.status === 'draft' && <button className="btn-principal" style={{ fontSize: '0.78rem', padding: '4px 12px' }} onClick={() => handleIniciar(t.id)}>Iniciar</button>}
                {t.status === 'running' && <button className="btn-secundario" style={{ fontSize: '0.78rem', padding: '4px 12px' }} onClick={() => handleCompletar(t.id)}>Completar</button>}
              </div>
            </div>
            {t.description && <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', marginBottom: 8 }}>{t.description}</p>}
            <div style={{ fontSize: '0.78rem', color: 'var(--color-brown-600)', marginBottom: 8 }}>
              Objetivo: {t.targetMetric} · Creado: {new Date(t.createdAt).toLocaleDateString('es-PE')}
              {t.startedAt && ` · Iniciado: ${new Date(t.startedAt).toLocaleDateString('es-PE')}`}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {t.variants.map((v) => (
                <div key={v.id} className="card" style={{ flex: 1, minWidth: 140, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-brown-700)' }}>{v.trafficPct}% trafico</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-brown-600)' }}>
                    {v._count?.assignments || 0} cliente(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
