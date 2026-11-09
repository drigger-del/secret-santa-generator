import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Build the frontend into the server's public folder so Express can serve it.
// This keeps deployment to a single service (frontend + backend together).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
