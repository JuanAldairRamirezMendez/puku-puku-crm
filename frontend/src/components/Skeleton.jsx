export function SkeletonCard({ lines = 3, height = '100px' }) {
  return (
    <div className="skeleton-card" style={{ height, padding: 16 }}>
      <div className="skeleton-line skeleton-line--title" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="skeleton-kpi">
      <div className="skeleton-line skeleton-line--kpi-num" />
      <div className="skeleton-line skeleton-line--kpi-label" />
    </div>
  );
}

export function SkeletonSearchResult() {
  return (
    <div className="skeleton-result">
      <div className="skeleton-line skeleton-line--name" />
      <div className="skeleton-line skeleton-line--detail" style={{ width: '50%' }} />
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="skeleton-sidebar">
      <div className="skeleton-avatar" />
      <div className="skeleton-line skeleton-line--title" style={{ width: '60%' }} />
      <div className="skeleton-line" style={{ width: '40%' }} />
      <div style={{ marginTop: 16 }}>{Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${80 - i * 10}%`, marginBottom: 8 }} />
      ))}</div>
    </div>
  );
}
