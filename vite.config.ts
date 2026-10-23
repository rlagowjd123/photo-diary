/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME } from './src/config';

const base = '/photo-diary/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f1ea',
        theme_color: '#f5f1ea',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
