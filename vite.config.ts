/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Served from the domain root (Cloudflare Pages). Absolute asset paths keep deep links
  // like /dogs/<id> working on reload; a relative base would resolve them under /dogs/.
  base: '/',
  plugins: [
    react(),
    // `npm run dev:lan`: self-signed HTTPS so phones on the local network get a secure
    // context (camera, OPFS). The browser will show a certificate warning to accept.
    ...(mode === 'lan' ? [basicSsl({ name: 'training-tracker-dev' })] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Training Tracker',
        short_name: 'Training',
        description: 'Seguimiento del entrenamiento con tus perros',
        lang: 'es',
        theme_color: '#1f6f5c',
        background_color: '#f3f5f8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Page tests render the whole Ionic app over IndexedDB and get slow when files run in parallel.
    testTimeout: 15000,
    server: { deps: { inline: ['@ionic/react', '@ionic/core', 'ionicons'] } },
  },
}))
