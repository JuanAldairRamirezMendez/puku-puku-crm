const BASE_URL = (import.meta as any).env.VITE_API_URL || '/api';

interface ApiResponse {
  error?: string;
  [key: string]: unknown;
}

interface UsuarioData {
  id: string;
  nombre: string;
  rol: string;
}

interface ClienteData {
  id: string;
  nombreCompleto: string;
  telefono: string;
  [key: string]: unknown;
}

interface PaginatedResponse {
  data: ClienteData[];
  total: number;
  page: number;
  totalPages: number;
}

async function request<T = ApiResponse>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const data = await res.json().catch(() => ({})) as ApiResponse;
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status} al consultar ${path}`);
  }
  return data as T;
}

interface LoginResponse {
  usuario: UsuarioData;
}

interface MeResponse {
  usuario: UsuarioData;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  verificarSesion: () => request<MeResponse>('/auth/me'),
  buscarClientes: (q: string) => request<PaginatedResponse>(`/clientes/buscar?q=${encodeURIComponent(q)}`),
  crearCliente: (datos: Record<string, unknown>) => request('/clientes', { method: 'POST', body: datos }),
  obtenerCliente: (id: string) => request(`/clientes/${id}`),
  obtenerChurnScore: (id: string) => request(`/clientes/${id}/churn-score`),
  crearInteraccion: (clienteId: string, datos: Record<string, unknown>) =>
    request(`/clientes/${clienteId}/interacciones`, { method: 'POST', body: datos }),
  cerrarInteraccion: (interaccionId: string, datos: Record<string, unknown>) =>
    request(`/interacciones/${interaccionId}/cerrar`, { method: 'PATCH', body: datos }),
  clientesFrecuentes: (minVisitas = 3) => request(`/reportes/clientes-frecuentes?minVisitas=${minVisitas}`),
  analytics: (params: Record<string, string> = {}) => {
    const q = Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return request(`/reportes/analytics${q ? '?' + q : ''}`);
  },
  segmentacion: (k = 3) => request('/reportes/segmentacion', { method: 'POST', body: { k } }),
  predecirChurn: (data: Record<string, unknown>) => request('/reportes/predecir-churn', { method: 'POST', body: data }),
  predecirChurnCliente: (id: string) => request(`/reportes/predecir-churn/${id}`),
  entrenarModelo: () => request('/reportes/entrenar-modelo', { method: 'POST' }),
  exportarCsv: async () => {
    const res = await fetch(`${BASE_URL}/reportes/export-apf3.csv`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as ApiResponse;
      throw new Error(data.error || `Error ${res.status} al exportar`);
    }
    return res.blob();
  },
  entrenarMl: () => request('/reportes/entrenar', { method: 'POST' }),
  entrenarStatus: () => request('/reportes/entrenar/status'),
};
