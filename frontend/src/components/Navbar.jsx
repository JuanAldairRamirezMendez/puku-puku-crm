import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/index';

export default function Navbar() {
  const usuario = useStore((s) => s.usuario);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleSalir() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="navbar">
      <div className="marca">
        <span className="bird">🐦</span> PUKU PUKU
      </div>
      <nav>
        <NavLink to="/buscar" className={({ isActive }) => isActive ? 'activo' : ''}>
          Buscar / Registrar
        </NavLink>
        <NavLink to="/frecuentes" className={({ isActive }) => isActive ? 'activo' : ''}>
          Clientes frecuentes
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'activo' : ''}>
          Analytics
        </NavLink>
        {usuario?.rol === 'ADMINISTRADOR' && (
          <NavLink to="/auditoria" className={({ isActive }) => isActive ? 'activo' : ''}>
            Auditoría
          </NavLink>
        )}
      </nav>
      <div className="sesion">
        <span>{usuario?.nombre}</span>
        <button onClick={handleSalir}>Salir</button>
      </div>
    </header>
  );
}
