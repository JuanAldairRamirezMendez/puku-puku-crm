import { useEffect, useState } from 'react';

const MODELOS = ['', 'RandomForest', 'XGBoost', 'GradientBoosting', 'LogisticRegression'];

export default function PantallaExperimentos() {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState('');

  async function cargar(p) {
    try {
      const params = new URLSearchParams({ page: String(p), limit: '10' });
      const res = await fetch(`/api/experimentos?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRuns(data.data);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(pagina); }, [pagina]);

  return (
    <div>
      <h1 className="titulo-pantalla">Experiment Tracking ML</h1>
      <p className="subtitulo-pantalla">
        Historial de corridas de entrenamiento del modelo de churn. Cada fila es un experimento completo con 11 modelos y validacion cruzada.
      </p>

      {error && <div className="error-msg">{error}</div>}
      <p style={{ fontSize: '0.82rem', color: 'var(--color-brown-700)', marginBottom: 12 }}>
        {total} experimento(s)
      </p>

      {runs.length === 0 && (
        <div className="card"><p style={{ padding: 16 }}>Sin experimentos registrados. Entrena el modelo desde Analytics primero.</p></div>
      )}

      {runs.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>{r.bestModel || '—'}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-brown-700)' }}>
              {new Date(r.createdAt).toLocaleString('es-PE')}
            </span>
          </div>
          <div className="metricas-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {r.accuracy != null && (
              <div className="card metrica-card" style={{ padding: '8px 12px' }}>
                <span className="metrica-valor" style={{ fontSize: '1rem' }}>{(r.accuracy * 100).toFixed(1)}%</span>
                <span className="metrica-label">Accuracy</span>
              </div>
            )}
            {r.precision != null && (
              <div className="card metrica-card" style={{ padding: '8px 12px' }}>
                <span className="metrica-valor" style={{ fontSize: '1rem' }}>{(r.precision * 100).toFixed(1)}%</span>
                <span className="metrica-label">Precision</span>
              </div>
            )}
            {r.recall != null && (
              <div className="card metrica-card" style={{ padding: '8px 12px' }}>
                <span className="metrica-valor" style={{ fontSize: '1rem' }}>{(r.recall * 100).toFixed(1)}%</span>
                <span className="metrica-label">Recall</span>
              </div>
            )}
            {r.f1 != null && (
              <div className="card metrica-card" style={{ padding: '8px 12px' }}>
                <span className="metrica-valor" style={{ fontSize: '1rem' }}>{(r.f1 * 100).toFixed(1)}%</span>
                <span className="metrica-label">F1</span>
              </div>
            )}
            {r.rocAuc != null && (
              <div className="card metrica-card" style={{ padding: '8px 12px' }}>
                <span className="metrica-valor" style={{ fontSize: '1rem' }}>{(r.rocAuc * 100).toFixed(1)}%</span>
                <span className="metrica-label">ROC-AUC</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-brown-700)', marginTop: 8 }}>
            Clientes: {r.nCustomers || '—'} · Features: {r.nFeatures || '—'} · Churn rate: {r.churnRate != null ? `${(r.churnRate * 100).toFixed(1)}%` : '—'}
            {r.targetsMet != null && (
              <span style={{ marginLeft: 12, color: r.targetsMet ? 'var(--color-success)' : 'var(--color-danger)' }}>
                Targets: {r.targetsMet ? 'OK' : 'NO'}
              </span>
            )}
          </div>
          {r.metrics && (
            <details style={{ marginTop: 8, fontSize: '0.78rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-terracotta)' }}>Ver comparativa completa</summary>
              <div style={{ marginTop: 8, overflowX: 'auto' }}>
                <ComparativaTable metrics={r.metrics} />
              </div>
            </details>
          )}
        </div>
      ))}

      {total > 10 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button className="btn-secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            ← Anterior
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--color-brown-700)' }}>
            Pag. {pagina}
          </span>
          <button className="btn-secundario" disabled={pagina * 10 >= total} onClick={() => setPagina((p) => p + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function ComparativaTable({ metrics }) {
  let data;
  try { data = typeof metrics === 'string' ? JSON.parse(metrics) : metrics; } catch { return null; }
  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
      <thead>
        <tr style={{ background: 'var(--color-sand)' }}>
          <th style={{ padding: '4px 8px', textAlign: 'left' }}>Modelo</th>
          <th style={{ padding: '4px 8px' }}>Acc</th>
          <th style={{ padding: '4px 8px' }}>Prec</th>
          <th style={{ padding: '4px 8px' }}>Rec</th>
          <th style={{ padding: '4px 8px' }}>F1</th>
          <th style={{ padding: '4px 8px' }}>AUC</th>
        </tr>
      </thead>
      <tbody>
        {data.map((m, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--color-sand)' }}>
            <td style={{ padding: '4px 8px', fontWeight: i === 0 ? 'bold' : 'normal' }}>{m.model}</td>
            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{m.accuracy != null ? (m.accuracy * 100).toFixed(1) : '—'}</td>
            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{m.precision != null ? (m.precision * 100).toFixed(1) : '—'}</td>
            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{m.recall != null ? (m.recall * 100).toFixed(1) : '—'}</td>
            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{m.f1 != null ? (m.f1 * 100).toFixed(1) : '—'}</td>
            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{m.roc_auc != null ? (m.roc_auc * 100).toFixed(1) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
