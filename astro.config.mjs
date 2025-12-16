// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';
import Critters from 'critters';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// https://astro.build/config
export default defineConfig({
  integrations: [
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
          name: 'NFL Playoff Picture 2025',
          short_name: 'NFL Playoff',
          description: 'NFL Playoff Picture 2025 Standings',
          theme_color: '#013369',
          background_color: '#013369',
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
          navigateFallback: '/index.html',
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
