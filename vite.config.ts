import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };
const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? version)
  },
  plugins: [
    react() as any,
    tailwindcss() as any,
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['map-official.webp', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
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
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true
      }
    }) as any
  ],
  build: {
    sourcemap: true
  },
  server: {
    port: 5174,
    strictPort: false
  },
  preview: {
    port: 5174,
    strictPort: false
  }
});

if (process.env.SENTRY_AUTH_TOKEN) {
  config.plugins?.push(sentryVitePlugin({
    org: 'thrivbe',
    project: 'jomo-guide',
    url: 'https://de.sentry.io',
    sourcemaps: {
      filesToDeleteAfterUpload: ['dist/**/*.map']
    }
  }) as any);
}

export default config;
