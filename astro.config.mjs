// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import Critters from 'critters';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  site: 'https://playoffs-picture.vercel.app',
  // Explicit Vite aliases also resolve Sass modules and asset URLs.
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@scraper': fileURLToPath(new URL('./scraper', import.meta.url)),
      },
    },
  },
  integrations: [
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/schedule/') }),
    {
      name: 'critical-css',
      hooks: {
        'astro:build:done': async ({ dir }) => {
            const critters = new Critters({
                path: './dist/',
                publicPath: './dist/',
                inlineFonts: true,
                preload: 'media', // Uses media="print" + onload pattern
                compress: true,
                // Standalone is detected before paint; preserve its reserved carousel space.
                allowRules: [/my-teams/],
            });

            try {
                const html = await readFile('./dist/index.html', 'utf-8');
                const inlined = await critters.process(html);
                await writeFile('./dist/index.html', inlined);
                console.log('✅ Critical CSS generated with Critters');
            } catch (e) {
                console.error('Failed to generate critical CSS:', e);
            }
        }
      }
    },
    AstroPWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'NFL Playoff Picture 2026',
          short_name: 'NFL Playoff',
          description: 'NFL Playoff Picture 2026 Standings',
          theme_color: '#252525',
          background_color: '#252525',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Keep page navigations fresh; cache static week fragments for offline selection.
          globPatterns: ['**/*.{js,css,ico,png,svg,json,woff,woff2}', 'schedule/**/*.html'],
          // PWA-only dashboard resources must not be downloaded by a browser tab's precache.
          globIgnores: ['**/data-version.json', '**/my-teams.json', '**/my-teams*.{js,css}'],
          navigateFallback: null,
          runtimeCaching: [{
            urlPattern: /\/my-teams\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'my-teams-data-v1',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [200] },
            },
          }, {
            urlPattern: /\/_astro\/my-teams\.[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'my-teams-code-v1',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 4 },
            },
          }, {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-v1',
              networkTimeoutSeconds: 5,
              fetchOptions: { cache: 'no-cache' },
              cacheableResponse: { statuses: [200] },
            },
          }],
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true
        },
        devOptions: {
          enabled: true,
          suppressWarnings: true,
        }
    })
  ]
});
