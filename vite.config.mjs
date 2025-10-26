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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // React Router
          'react-router': ['react-router-dom'],
          // Mantine UI components
          'mantine-core': ['@mantine/core'],
          'mantine-hooks': ['@mantine/hooks', '@mantine/form'],
          // Icons
          icons: ['@tabler/icons-react'],
          // Redux
          redux: ['@reduxjs/toolkit', 'react-redux'],
          // Supabase
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
