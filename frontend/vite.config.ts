import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Gym Tracker',
        short_name: 'Gym',
        description: 'Tu sistema de entrenamiento personal',
        theme_color: '#01696f',
        background_color: '#171614',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'vendor-react'
          if (id.includes('node_modules/recharts')) return 'vendor-charts'
          if (id.includes('node_modules/zustand')) return 'vendor-store'
        },
      },
    },
  },
  server: {
    host: true,
    hmr: {
      // Más tiempo antes de forzar reload cuando el WS se cae (útil en móvil/Tailscale)
      timeout: 120000,
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
