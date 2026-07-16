import type { Preview } from '@storybook/react-vite';
import '../src/styles/theme.css';
import '../src/i18n/index.js';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    backgrounds: {
      values: [
        { name: 'crema', value: '#faf3ea' },
        { name: 'blanco', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
