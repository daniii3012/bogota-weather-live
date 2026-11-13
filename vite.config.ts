import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Bogotá Weather Live',
        short_name: 'Bogotá Weather',
        description: 'El clima de Bogotá en tiempo real sobre un mapa (no oficial).',
        lang: 'es-CO',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#101418',
        theme_color: '#101418',
        categories: ['weather', 'utilities'],
        shortcuts: [
          { name: 'Pronóstico', short_name: 'Pronóstico', url: './#/pronostico', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Ríos y quebradas', short_name: 'Ríos', url: './#/rios', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Armazón, fuentes y límites de las localidades en la precarga; las teselas, en caché de uso.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,json}'],
        // Subconjuntos de letra que el español no usa: el navegador los pide solo si hacen falta.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese,symbols2}-*'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/icons\//, /\.(?:png|jpg|ico|svg|webmanifest|xml|json)$/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Activación inmediata: sin esto la versión nueva queda en espera hasta cerrar todas las pestañas.
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org' && /\.pbf$/.test(url.pathname) && !url.pathname.startsWith('/fonts'),
            handler: 'CacheFirst',
            options: { cacheName: 'teselas', expiration: { maxEntries: 2000, maxAgeSeconds: 7 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org' && (url.pathname.startsWith('/fonts') || url.pathname === '/planet'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'mapa-base', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          // Los datos en vivo nunca pasan por esta caché: la página guarda la última respuesta y la
          // muestra con su edad; un dato viejo presentado como actual es peor que ninguno.
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173, host: true },
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
