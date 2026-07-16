import { create } from 'zustand';
import { api } from '../api/client';

export interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

interface AppState {
  usuario: Usuario | null;
  verificando: boolean;
  clienteSeleccionadoId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verificarSesion: () => Promise<void>;
  seleccionarCliente: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  usuario: null,
  verificando: true,
  clienteSeleccionadoId: null,

  login: async (email, password) => {
    const data = await api.login(email, password);
    set({ usuario: data.usuario });
  },

  logout: async () => {
    await api.logout().catch(() => {});
    set({ usuario: null, clienteSeleccionadoId: null });
  },

  verificarSesion: async () => {
    set({ verificando: true });
    try {
      const data = await api.verificarSesion();
      set({ usuario: data.usuario, verificando: false });
    } catch {
      set({ usuario: null, verificando: false });
    }
  },

  seleccionarCliente: (id) => set({ clienteSeleccionadoId: id }),
}));
