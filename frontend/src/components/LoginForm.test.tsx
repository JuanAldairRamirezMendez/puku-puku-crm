import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithRouter } from '../test/utils';
import LoginForm from './LoginForm';

const mockLogin = vi.fn();

vi.mock('../store/index.js', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) => selector({
    login: mockLogin,
    usuario: null,
    verificando: false,
    clienteSeleccionadoId: null,
    logout: vi.fn(),
    verificarSesion: vi.fn(),
    seleccionarCliente: vi.fn(),
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('renderiza el formulario de login', () => {
    renderWithRouter(<LoginForm />);
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('llama login del store con email y password', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    renderWithRouter(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Correo'), 'carla@pukupuku.pe');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('carla@pukupuku.pe', 'secreto');
    });
  });

  it('muestra mensaje de error si el servidor rechaza', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas.'));

    renderWithRouter(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Correo'), 'bad@pukupuku.pe');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas.')).toBeInTheDocument();
    });
  });

  it('deshabilita el botón mientras carga', async () => {
    mockLogin.mockImplementationOnce(() => new Promise(() => {}));

    renderWithRouter(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Correo'), 'carla@pukupuku.pe');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
  });
});
