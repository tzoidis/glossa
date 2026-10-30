import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // relative paths: the same build works at a domain root or a subpath (GitHub Pages)
  base: './',
  plugins: [
    react(),
    VitePWA({
      // never swap versions on its own: the app applies an update only on the start
      // screen or from the parent screen, never in the middle of a round (PRD §7)
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Glossa',
        short_name: 'Glossa',
        lang: 'el',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fdf8ee',
        theme_color: '#2f7d4a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // everything the app needs offline, including bundled recordings
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2,mp3,m4a,aac,ogg,webm,wav}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // property tests sweep every position × level × seed
    testTimeout: 30_000,
  },
});
