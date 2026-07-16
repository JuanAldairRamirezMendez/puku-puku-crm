import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithRouter } from '../test/utils';
import Navbar from './Navbar';

const mockLogout = vi.fn().mockResolvedValue(undefined);

const defaultStore = {
  usuario: { id: '1', nombre: 'Carla', rol: 'COLABORADOR' },
  login: vi.fn(),
  logout: mockLogout,
  verificarSesion: vi.fn(),
  verificando: false,
  clienteSeleccionadoId: null,
  seleccionarCliente: vi.fn(),
};

vi.mock('../store/index.js', () => ({
  useStore: (selector: (s: typeof defaultStore) => unknown) => selector(defaultStore),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it('muestra el nombre del usuario', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByText('Carla')).toBeInTheDocument();
  });

  it('tiene enlace funcional a Analytics', () => {
    renderWithRouter(<Navbar />);
    const link = screen.getByText('Analytics');
    expect(link.closest('a')).toHaveAttribute('href', '/analytics');
  });

  it('llama logout al hacer clic en Salir', async () => {
    renderWithRouter(<Navbar />);
    await userEvent.click(screen.getByText('Salir'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
