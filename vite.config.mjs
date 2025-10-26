import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: ['macros-count-app.fedorresh.ru'],
  },
});
