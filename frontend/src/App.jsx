import { useState } from 'react';
import LoginForm from './components/LoginForm.jsx';
import Navbar from './components/Navbar.jsx';
import Pantalla1Registro from './pages/Pantalla1Registro.jsx';
import Pantalla2Historial from './pages/Pantalla2Historial.jsx';
import PantallaFrecuentes from './pages/PantallaFrecuentes.jsx';
import { setToken } from './api/client';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState('buscar'); // 'buscar' | 'historial' | 'frecuentes'
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  function handleLogin(datosUsuario) {
    setUsuario(datosUsuario);
  }

  function handleSalir() {
    setToken(null);
    setUsuario(null);
    setVista('buscar');
    setClienteSeleccionado(null);
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
      </main>
    </div>
  );
}
