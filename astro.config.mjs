// @ts-check
import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';
import { generate } from 'critical';

// https://astro.build/config
export default defineConfig({
  integrations: [
    {
      name: 'critical-css',
      hooks: {
        'astro:build:done': async ({ dir }) => {
            await generate({
                base: './dist/',
                src: 'index.html',
                target: 'index.html',
                inline: true,
                extract: true,
                dimensions: [
                    { width: 375, height: 600 },
                    { width: 1300, height: 900 }
                ]
            });
            console.log('✅ Critical CSS generated (Astro Integration)');
        }
      }
    }
  ],
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'NFL Playoff Picture 2025',
          short_name: 'NFL Playoffs',
          description: 'NFL Playoff Picture 2025 Standings',
          theme_color: '#013369',
          background_color: '#013369',
          display: 'standalone',
          icons: [
            {
              src: '/logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          navigateFallback: null
        }
      })
    ]
  }
});
