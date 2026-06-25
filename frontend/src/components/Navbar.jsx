export default function Navbar({ vista, onCambiarVista, usuario, onSalir }) {
  return (
    <header className="navbar">
      <div className="marca">
        <span className="bird">🐦</span> PUKU PUKU
      </div>
      <nav>
        <button
          className={vista === 'buscar' ? 'activo' : ''}
          onClick={() => onCambiarVista('buscar')}
        >
          Buscar / Registrar
        </button>
        <button
          className={vista === 'frecuentes' ? 'activo' : ''}
          onClick={() => onCambiarVista('frecuentes')}
        >
          Clientes frecuentes
        </button>
      </nav>
      <div className="sesion">
        <span>{usuario?.nombre}</span>
        <button onClick={onSalir}>Salir</button>
      </div>
    </header>
  );
}
