import LoginForm from '../components/LoginForm';

export default {
  title: 'Components/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'crema' },
  },
};

export const Default = {
  parameters: {
    reactRouter: { routePath: '/login' },
  },
};
