import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: process.env.BACKEND_URL ?? 'http://localhost:8080', changeOrigin: true },
      '/actuator/health': { target: process.env.BACKEND_URL ?? 'http://localhost:8080' },
    },
  },
});
