import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Agenda de Audiências CPE',
        short_name: 'Agenda CPE',
        description: 'Sistema de agendamento de audiências CPE',
        theme_color: '#D90404',
        background_color: '#0A0B0D',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // evita que o SW faça fallback para index.html em erros de rede
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          // ===== NÃO INTERCEPTAR/CACHEAR Firebase Auth (PRODUÇÃO) =====
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*$/i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*$/i,
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*$/i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*$/i,
            handler: 'NetworkOnly',
            method: 'POST',
          },

          // ===== NÃO INTERCEPTAR/CACHEAR Firebase Auth (EMULADOR) =====
          {
            urlPattern: /^http:\/\/(?:localhost|127\.0\.0\.1):9099\/identitytoolkit\.googleapis\.com\/.*$/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^http:\/\/(?:localhost|127\.0\.0\.1):9099\/securetoken\.googleapis\.com\/.*$/i,
            handler: 'NetworkOnly',
          },

          // ===== Fonts CSS (googleapis) – StaleWhileRevalidate =====
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },

          // ===== Fonts binárias (gstatic) – CacheFirst =====
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      // atualiza clientes imediatamente após instalar novo SW
      devOptions: {
        // habilite se quiser testar PWA em dev; pode deixar comentado
        enabled: false,
      },
      // garante que o novo SW assuma controle mais rápido
      injectRegister: 'auto',
      // registerWebManifestInRouteRules: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
