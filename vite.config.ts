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
          // GARANTA que estes arquivos realmente existam em /public e sejam pequenos (<100 KB)
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // ↑ aumenta o limite de pré-cache (opcional, ajuda em assets um pouco maiores)
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

        // padrões de arquivos a incluir na varredura
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp}'],

        // ↑ tenta ignorar explicitamente ícones problemáticos (caso existam no /public)
        globIgnores: ['**/icon-192x192.png', '**/icon-512x512.png'],

        // ↑ remove entradas específicas do manifesto de pré-cache (fallback robusto)
        manifestTransforms: [
          async (entries) => {
            const blocked = [/icon-192x192\.png$/i, /icon-512x512\.png$/i];
            const manifest = entries.filter(e => !blocked.some(r => r.test(e.url)));
            return { manifest };
          }
        ],

        // Caching de fontes (como você já tinha)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
