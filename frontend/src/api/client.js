const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'puku_token';
const USUARIO_KEY = 'puku_usuario';

let tokenEnMemoria = sessionStorage.getItem(TOKEN_KEY) || null;

export function setToken(token) {
  tokenEnMemoria = token;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function clearSession() {
  setToken(null);
  sessionStorage.removeItem(USUARIO_KEY);
}

export function getUsuarioGuardado() {
  const raw = sessionStorage.getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

function guardarUsuario(usuario) {
  if (usuario) {
    sessionStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  }
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenEnMemoria) headers.Authorization = `Bearer ${tokenEnMemoria}`;
  return headers;
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
    }
    throw new Error(data.error || `Error ${res.status} al consultar ${path}`);
  }
  return data;
}

export const api = {
  login: async (email, password) => {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    guardarUsuario(data.usuario);
    return data;
  },
  verificarSesion: () => request('/auth/me'),
  buscarClientes: (q) => request(`/clientes/buscar?q=${encodeURIComponent(q)}`),
  crearCliente: (datos) => request('/clientes', { method: 'POST', body: datos }),
  obtenerCliente: (id) => request(`/clientes/${id}`),
  crearInteraccion: (clienteId, datos) =>
    request(`/clientes/${clienteId}/interacciones`, { method: 'POST', body: datos }),
  cerrarInteraccion: (interaccionId, datos) =>
    request(`/interacciones/${interaccionId}/cerrar`, { method: 'PATCH', body: datos }),
  clientesFrecuentes: (minVisitas = 3) => request(`/reportes/clientes-frecuentes?minVisitas=${minVisitas}`),
  analytics: (params = {}) => {
    const q = Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return request(`/reportes/analytics${q ? '?' + q : ''}`);
  },
  segmentacion: (k = 3) => request('/reportes/segmentacion', { method: 'POST', body: { k } }),
  exportarCsv: async () => {
    const res = await fetch(`${BASE_URL}/reportes/export-apf3.csv`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error ${res.status} al exportar`);
    }
    return res.blob();
  },
};
