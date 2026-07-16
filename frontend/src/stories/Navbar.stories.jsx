import Navbar from '../components/Navbar';

export default {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'crema' },
  },
};

export const Default = {};

export const Administrador = {
  parameters: {
    zustand: {
      usuario: { nombre: 'Admin', rol: 'ADMINISTRADOR' },
    },
  },
};
