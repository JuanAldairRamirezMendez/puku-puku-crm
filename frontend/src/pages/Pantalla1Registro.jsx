import { useState } from 'react';
import { api } from '../api/client';

const CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA'];

// Traduce errores crudos del backend a mensajes claros para el personal del local,
// sin vaciar el formulario cuando falla el guardado (US01 / integración API).
function mensajeApiAmigable(mensajeCrudo) {
  if (!mensajeCrudo) return 'Ocurrió un error inesperado. Intenta de nuevo.';

  if (/valor único.*telefono|telefono.*único|P2002/i.test(mensajeCrudo)) {
    return 'Ya existe un cliente con ese teléfono. Verifica el número o búscalo en la lista.';
  }
  if (/nombreCompleto, telefono y canalOrigen/i.test(mensajeCrudo)) {
    return 'Completa nombre, teléfono y canal de origen antes de guardar.';
  }
  if (/29733|consentimiento/i.test(mensajeCrudo)) {
    return 'Debes marcar el consentimiento de la Ley N.° 29733 para registrar al cliente.';
  }
  if (/Cliente no encontrado/i.test(mensajeCrudo)) {
    return 'No se encontró ese cliente. Intenta buscar de nuevo.';
  }
  if (/Error interno del servidor/i.test(mensajeCrudo)) {
    return 'Hubo un problema en el servidor. Intenta de nuevo en unos segundos.';
  }
  if (/Error \d+ al consultar/i.test(mensajeCrudo)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta otra vez.';
  }
  return mensajeCrudo;
}

// Validación progresiva del teléfono peruano (+51 9XXXXXXXX): informa sin bloquear la escritura.
function evaluarTelefono(valor) {
  const limpio = valor.replace(/\s/g, '');
  if (!limpio) return { valido: false, mensaje: '', incompleto: true };

  const patronCompleto = /^\+519\d{8}$/;
  if (patronCompleto.test(limpio)) return { valido: true, mensaje: '', incompleto: false };

  const patronParcial = /^(\+|\+\d{0,2}|\+51\d{0,9})$/;
  if (patronParcial.test(limpio)) {
    return { valido: false, mensaje: '', incompleto: true };
  }

  return {
    valido: false,
    incompleto: false,
    mensaje: 'Formato esperado: +51 9XXXXXXXX (celular peruano de 9 dígitos).',
  };
}

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

  const telefonoEval = evaluarTelefono(form.telefono);
  const telefonoTocado = form.telefono.length > 0;

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
      setError(mensajeApiAmigable(err.message));
    }
  }

  async function handleRegistrar(e) {
    e.preventDefault();
    setError('');

    if (!telefonoEval.valido) {
      setError('Revisa el teléfono: debe tener el formato +51 9XXXXXXXX.');
      return;
    }

    try {
      const cliente = await api.crearCliente(form);
      onSeleccionarCliente(cliente.id);
    } catch (err) {
      // Solo actualiza el mensaje de error; el estado del formulario se conserva intacto.
      setError(mensajeApiAmigable(err.message));
    }
  }

  function seleccionarCanal(canal) {
    setForm({ ...form, canalOrigen: canal });
  }

  // Navegación por teclado en el selector de canal (flechas + Enter/Espacio).
  function handleCanalKeyDown(e, canal) {
    const idx = CANALES.indexOf(canal);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      seleccionarCanal(CANALES[(idx + 1) % CANALES.length]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      seleccionarCanal(CANALES[(idx - 1 + CANALES.length) % CANALES.length]);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      seleccionarCanal(canal);
    }
  }

  const puedeGuardar =
    form.consentimientoLey29733 && form.canalOrigen && telefonoEval.valido;

  return (
    <div>
      <h1 className="titulo-pantalla">Búsqueda y registro inicial</h1>
      <p className="subtitulo-pantalla">
        Busca por nombre o teléfono. Si el cliente no existe, regístralo aquí (US01, US08).
      </p>

      {error && (
        <div className="error-msg" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <input
        className="busqueda-input"
        type="search"
        aria-label="Buscar cliente por nombre o teléfono"
        placeholder="Buscar cliente por nombre o teléfono…"
        value={query}
        onChange={(e) => handleBuscar(e.target.value)}
      />

      {resultados.length > 0 && (
        <div className="card" style={{ marginTop: 12, padding: 0 }} role="listbox" aria-label="Resultados de búsqueda">
          {resultados.map((cliente) => (
            <button
              type="button"
              key={cliente.id}
              className="resultado-item"
              role="option"
              style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', font: 'inherit' }}
              onClick={() => onSeleccionarCliente(cliente.id)}
            >
              <strong>{cliente.nombreCompleto}</strong>
              <span>{cliente.telefono}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && resultados.length === 0 && !mostrarFormulario && (
        <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
          <p>No se encontraron clientes con ese criterio.</p>
          <button className="btn-principal" type="button" onClick={() => setMostrarFormulario(true)}>
            + Registrar nuevo cliente
          </button>
        </div>
      )}

      {mostrarFormulario && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Registro de nuevo cliente</h2>
          <form onSubmit={handleRegistrar} noValidate>
            <div className="campo">
              <label htmlFor="nombreCompleto">Nombre completo</label>
              <input
                id="nombreCompleto"
                value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                placeholder="Ej. Ana Torres"
                required
                autoComplete="name"
              />
            </div>

            <div className="campo">
              <label htmlFor="telefono">Teléfono / WhatsApp</label>
              <input
                id="telefono"
                type="tel"
                inputMode="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+51 9XX XXX XXX"
                required
                autoComplete="tel"
                aria-invalid={telefonoTocado && !telefonoEval.valido && !telefonoEval.incompleto}
                aria-describedby="telefono-ayuda"
                style={
                  telefonoTocado && !telefonoEval.valido && !telefonoEval.incompleto
                    ? { borderColor: 'var(--color-danger)' }
                    : undefined
                }
              />
              <p
                id="telefono-ayuda"
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.82rem',
                  color:
                    telefonoTocado && telefonoEval.valido
                      ? 'var(--color-success)'
                      : telefonoTocado && telefonoEval.mensaje
                        ? 'var(--color-danger)'
                        : 'var(--color-brown-700)',
                }}
              >
                {telefonoTocado && telefonoEval.valido
                  ? '✓ Formato válido'
                  : telefonoEval.mensaje || 'Ejemplo: +51 912345678'}
              </p>
            </div>

            <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brown-700)', marginBottom: 6 }}>
                Canal de origen
              </legend>
              <div className="canal-selector" role="group" aria-label="Canal de origen">
                {CANALES.map((canal) => (
                  <button
                    type="button"
                    key={canal}
                    className={form.canalOrigen === canal ? 'seleccionado' : ''}
                    aria-pressed={form.canalOrigen === canal}
                    onClick={() => seleccionarCanal(canal)}
                    onKeyDown={(e) => handleCanalKeyDown(e, canal)}
                  >
                    {canal}
                  </button>
                ))}
              </div>
            </fieldset>

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

            <label className="consentimiento" htmlFor="consentimiento">
              <input
                id="consentimiento"
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

            <button className="btn-principal" type="submit" disabled={!puedeGuardar}>
              Guardar cliente
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
