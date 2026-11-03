/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Versie in de app: pakketversie + commit (Cloudflare Pages zet CF_PAGES_COMMIT_SHA).
const version = `0.1.0+${(process.env.CF_PAGES_COMMIT_SHA ?? 'local').slice(0, 7)}`;

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Cueboard',
        short_name: 'Cueboard',
        description: 'Plan, assign and run your event with your crew.',
        lang: 'en',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#14112a',
        theme_color: '#14112a',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // Supabase-verkeer nooit door de service worker laten cachen: data gaat via IndexedDB.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Aparte bestanden voor bibliotheken: bij een app-update blijven die in de cache.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          dexie: ['dexie'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
