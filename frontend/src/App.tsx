import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm.jsx';
import Navbar from './components/Navbar.jsx';
import Pantalla1Registro from './pages/Pantalla1Registro.jsx';
import Pantalla2Historial from './pages/Pantalla2Historial.jsx';
import PantallaFrecuentes from './pages/PantallaFrecuentes.jsx';
import PantallaAnalytics from './pages/PantallaAnalytics.jsx';
import PantallaAuditoria from './pages/PantallaAuditoria.jsx';
import { useStore } from './store/index';
import { SkeletonCard } from './components/Skeleton.jsx';

function ProtectedLayout() {
  const usuario = useStore((s) => s.usuario);
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Navbar />
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Navigate to="/buscar" replace />} />
          <Route path="/buscar" element={<Pantalla1Registro />} />
          <Route path="/cliente/:id" element={<Pantalla2Historial />} />
          <Route path="/frecuentes" element={<PantallaFrecuentes />} />
          <Route path="/analytics" element={<PantallaAnalytics />} />
          <Route path="/auditoria" element={<PantallaAuditoria />} />
        </Routes>
      </main>
    </div>
  );
}

function LoginRoute() {
  const usuario = useStore((s) => s.usuario);
  if (usuario) return <Navigate to="/buscar" replace />;
  return (
    <div className="app-shell">
      <LoginForm />
    </div>
  );
}

export default function App() {
  const verificarSesion = useStore((s) => s.verificarSesion);
  const verificando = useStore((s) => s.verificando);

  useEffect(() => {
    verificarSesion();
  }, [verificarSesion]);

  if (verificando) {
    return (
      <div className="app-shell">
        <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 16px' }}>
          <SkeletonCard lines={2} height="120px" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
