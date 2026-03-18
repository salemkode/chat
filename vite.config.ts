import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'

const tanstackEventBusEnabled = process.env.TANSTACK_DEVTOOLS_EVENT_BUS === '1'
const tanstackEventBusPort = Number.parseInt(
  process.env.TANSTACK_DEVTOOLS_EVENT_BUS_PORT ?? '42069',
  10,
)

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools({
      eventBusConfig: {
        enabled: tanstackEventBusEnabled,
        port: Number.isFinite(tanstackEventBusPort)
          ? tanstackEventBusPort
          : 42069,
      },
    }),
    tanstackStart({
      srcDirectory: 'src',
      router: {
        routesDirectory: './routes',
        generatedRouteTree: './routeTree.gen.ts',
        quoteStyle: 'single',
        semicolons: false,
      },
    }),
    netlify(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      manifest: false,
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'logo192.png',
        'logo512.png',
        'robots.txt',
        'theme-init.js',
        'fonts/*',
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{css,html,ico,js,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    viteReact({
      babel: {
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              target: '19',
            },
          ],
        ],
      },
    }),
  ],
})

export default config
