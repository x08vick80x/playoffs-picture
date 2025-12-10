// @ts-check
import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'NFL Playoff Picture 2025',
          short_name: 'Playoffs',
          description: 'NFL Playoff Picture 2025 Standings',
          theme_color: '#013369',
          background_color: '#ffffff',
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
