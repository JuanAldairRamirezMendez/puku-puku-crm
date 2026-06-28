import { useState } from 'react';
import { api } from '../api/client';

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];

export default function Pantalla1Registro({ onSeleccionarCliente }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombreCompleto: '',
    telefono: '',
    canalOrigen: '',
    productoFavorito: '',
    restriccionesAlergias: '',
    consentimientoLey29733: false,
  });

  async function handleBuscar(valor) {
    setQuery(valor);
    setError('');
    if (valor.trim().length < 2) {
      setResultados([]);
      return;
    }
    try {
      const res = await api.buscarClientes(valor);
      setResultados(res.data || res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRegistrar(e) {
    e.preventDefault();
    setError('');
    try {
      const cliente = await api.crearCliente(form);
      onSeleccionarCliente(cliente.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="titulo-pantalla">Búsqueda y registro inicial</h1>
      <p className="subtitulo-pantalla">
        Busca por nombre o teléfono. Si el cliente no existe, regístralo aquí (US01, US08).
      </p>

      {error && <div className="error-msg">{error}</div>}

      <input
        className="busqueda-input"
        placeholder="Buscar cliente por nombre o teléfono…"
        value={query}
        onChange={(e) => handleBuscar(e.target.value)}
      />

      {resultados.length > 0 && (
        <div className="card" style={{ marginTop: 12, padding: 0 }}>
          {resultados.map((cliente) => (
            <div
              key={cliente.id}
              className="resultado-item"
              onClick={() => onSeleccionarCliente(cliente.id)}
            >
              <strong>{cliente.nombreCompleto}</strong>
              <span>{cliente.telefono}</span>
            </div>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && resultados.length === 0 && !mostrarFormulario && (
        <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
          <p>No se encontraron clientes con ese criterio.</p>
          <button className="btn-principal" onClick={() => setMostrarFormulario(true)}>
            + Registrar nuevo cliente
          </button>
        </div>
      )}

      {mostrarFormulario && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Registro de nuevo cliente</h2>
          <form onSubmit={handleRegistrar}>
            <div className="campo">
              <label htmlFor="nombreCompleto">Nombre completo</label>
              <input
                id="nombreCompleto"
                value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                placeholder="Ej. Ana Torres"
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="telefono">Teléfono / WhatsApp</label>
              <input
                id="telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+51 9XX XXX XXX"
                required
              />
            </div>

            <div className="campo">
              <label>Canal de origen</label>
              <div className="canal-selector">
                {CANALES.map((canal) => (
                  <button
                    type="button"
                    key={canal}
                    className={form.canalOrigen === canal ? 'seleccionado' : ''}
                    onClick={() => setForm({ ...form, canalOrigen: canal })}
                  >
                    {canal}
                  </button>
                ))}
              </div>
            </div>

            <div className="campo">
              <label htmlFor="productoFavorito">Producto favorito</label>
              <input
                id="productoFavorito"
                value={form.productoFavorito}
                onChange={(e) => setForm({ ...form, productoFavorito: e.target.value })}
                placeholder="Ej. Flat white sin azúcar"
              />
            </div>

            <div className="campo">
              <label htmlFor="restricciones">Restricciones o alergias</label>
              <textarea
                id="restricciones"
                rows={2}
                value={form.restriccionesAlergias}
                onChange={(e) => setForm({ ...form, restriccionesAlergias: e.target.value })}
                placeholder="Ej. Intolerante a la lactosa"
              />
            </div>

            <label className="consentimiento">
              <input
                type="checkbox"
                checked={form.consentimientoLey29733}
                onChange={(e) =>
                  setForm({ ...form, consentimientoLey29733: e.target.checked })
                }
              />
              <span>
                El cliente autoriza el uso de sus datos personales conforme a la Ley N.° 29733
                de Protección de Datos Personales.
              </span>
            </label>

            <button
              className="btn-principal"
              type="submit"
              disabled={!form.consentimientoLey29733 || !form.canalOrigen}
            >
              Guardar cliente
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
