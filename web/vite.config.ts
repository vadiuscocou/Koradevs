import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = process.env.SOS_API ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Autorise les liens de partage temporaires (ngrok, cloudflared) pour les tests d'équipe.
    allowedHosts: true,
    proxy: {
      '/api': { target: api, rewrite: (path) => path.replace(/^\/api/, '') },
      '/ws': { target: api.replace(/^http/, 'ws'), ws: true },
    },
  },
});
