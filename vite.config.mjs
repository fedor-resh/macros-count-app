import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      'macros-count-app-frontend-k8ygnp-b67887-95-165-81-100.traefik.me',
      'macros-count-app.fedorresh.ru',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
});
