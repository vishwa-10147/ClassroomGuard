import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000';
const wsProxyTarget = apiProxyTarget.replace(/^http/, 'ws');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['lucide-react', 'zustand'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
          target: apiProxyTarget,
        changeOrigin: true,
      },
      '/ws': {
          target: wsProxyTarget,
        ws: true,
      },
    },
  },
});
