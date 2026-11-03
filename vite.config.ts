/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Art of Faith Production Hub',
        short_name: 'AoF Hub',
        description: 'Productieplatform voor het Art of Faith-festivalweekend',
        lang: 'nl-BE',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#14112a',
        theme_color: '#14112a',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        // Supabase-verkeer nooit door de service worker laten cachen: data gaat via IndexedDB.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
