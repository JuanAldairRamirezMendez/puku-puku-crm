import { useEffect, useState } from 'react';
import LoginForm from './components/LoginForm.jsx';
import Navbar from './components/Navbar.jsx';
import Pantalla1Registro from './pages/Pantalla1Registro.jsx';
import Pantalla2Historial from './pages/Pantalla2Historial.jsx';
import PantallaFrecuentes from './pages/PantallaFrecuentes.jsx';
import PantallaAnalytics from './pages/PantallaAnalytics.jsx';
import { api, clearSession, getUsuarioGuardado } from './api/client';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState('buscar');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const guardado = getUsuarioGuardado();
    if (guardado) {
      api.verificarSesion()
        .then((data) => setUsuario(data.usuario))
        .catch(() => clearSession())
        .finally(() => setVerificando(false));
    } else {
      setVerificando(false);
    }
  }, []);

  function handleLogin(datosUsuario) {
    setUsuario(datosUsuario);
  }

  function handleSalir() {
    clearSession();
    setUsuario(null);
    setVista('buscar');
    setClienteSeleccionado(null);
  }

  if (verificando) {
    return <div className="app-shell"><p style={{ textAlign: 'center', marginTop: 80 }}>Verificando sesión…</p></div>;
  }

  function handleSeleccionarCliente(id) {
    setClienteSeleccionado(id);
    setVista('historial');
  }

  if (!usuario) {
    return (
      <div className="app-shell">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        vista={vista === 'historial' ? 'buscar' : vista}
        onCambiarVista={(v) => {
          setVista(v);
          setClienteSeleccionado(null);
        }}
        usuario={usuario}
        onSalir={handleSalir}
      />
      <main className="contenido">
        {vista === 'buscar' && (
          <Pantalla1Registro onSeleccionarCliente={handleSeleccionarCliente} />
        )}
        {vista === 'historial' && clienteSeleccionado && (
          <Pantalla2Historial
            clienteId={clienteSeleccionado}
            onVolver={() => setVista('buscar')}
          />
        )}
        {vista === 'frecuentes' && <PantallaFrecuentes />}
        {vista === 'analytics' && <PantallaAnalytics />}
      </main>
    </div>
  );
}
