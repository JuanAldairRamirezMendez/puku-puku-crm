const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  return headers;
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: authHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status} al consultar ${path}`);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  verificarSesion: () => request('/auth/me'),
  buscarClientes: (q) => request(`/clientes/buscar?q=${encodeURIComponent(q)}`),
  crearCliente: (datos) => request('/clientes', { method: 'POST', body: datos }),
  obtenerCliente: (id) => request(`/clientes/${id}`),
  obtenerChurnScore: (id) => request(`/clientes/${id}/churn-score`),
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
  predecirChurn: (data) => request('/reportes/predecir-churn', { method: 'POST', body: data }),
  predecirChurnCliente: (id) => request(`/reportes/predecir-churn/${id}`),
  entrenarModelo: () => request('/reportes/entrenar-modelo', { method: 'POST' }),
  exportarCsv: async () => {
    const res = await fetch(`${BASE_URL}/reportes/export-apf3.csv`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error ${res.status} al exportar`);
    }
    return res.blob();
  },
  entrenarMl: () => request('/reportes/entrenar', { method: 'POST' }),
  entrenarStatus: () => request('/reportes/entrenar/status'),
};
