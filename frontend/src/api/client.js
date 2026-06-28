const BASE_URL = '/api';

let tokenEnMemoria = null;

export function setToken(token) {
  tokenEnMemoria = token;
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenEnMemoria) headers.Authorization = `Bearer ${tokenEnMemoria}`;
  return headers;
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status} al consultar ${path}`);
  }
  return data;
}

export const api = {
  _authHeader: authHeaders,
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  buscarClientes: (q) => request(`/clientes/buscar?q=${encodeURIComponent(q)}`),
  crearCliente: (datos) => request('/clientes', { method: 'POST', body: datos }),
  obtenerCliente: (id) => request(`/clientes/${id}`),
  crearInteraccion: (clienteId, datos) =>
    request(`/clientes/${clienteId}/interacciones`, { method: 'POST', body: datos }),
  cerrarInteraccion: (interaccionId, datos) =>
    request(`/interacciones/${interaccionId}/cerrar`, { method: 'PATCH', body: datos }),
  clientesFrecuentes: (minVisitas = 3) => request(`/reportes/clientes-frecuentes?minVisitas=${minVisitas}`),
};
