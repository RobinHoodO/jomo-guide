import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react() as any,
    tailwindcss() as any,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['events.json', 'map-official.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Jomo Guide',
        short_name: 'Jomo Guide',
        description: 'Offline Borderland 2026 program companion.',
        theme_color: '#161B33',
        background_color: '#161B33',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png}'],
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true
      }
    }) as any
  ],
  server: {
    port: 5174,
    strictPort: false
  },
  preview: {
    port: 5174,
    strictPort: false
  }
});
