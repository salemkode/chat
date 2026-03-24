import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import viteReact from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'

const tanstackEventBusEnabled = process.env.TANSTACK_DEVTOOLS_EVENT_BUS === '1'
const tanstackViteDevtoolsEnabled = process.env.TANSTACK_VITE_DEVTOOLS === '1'
const tanstackEventBusPort = Number.parseInt(
  process.env.TANSTACK_DEVTOOLS_EVENT_BUS_PORT ?? '42069',
  10,
)

const config = defineConfig({
  optimizeDeps: {
    exclude: ['@tanstack/router-core'],
  },
  server: {
    forwardConsole: false,
  },
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@convex': fileURLToPath(new URL('../../convex', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['@clerk/tanstack-react-start', '@clerk/react', '@clerk/shared'],
    resolve: {
      conditions: ['module', 'browser', 'development'],
      externalConditions: ['node'],
    },
  },
  plugins: [
    ...(tanstackViteDevtoolsEnabled
      ? [
          devtools({
            eventBusConfig: {
              enabled: tanstackEventBusEnabled,
              port: Number.isFinite(tanstackEventBusPort)
                ? tanstackEventBusPort
                : 42069,
            },
          }),
        ]
      : []),
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
        // SPA: serve precached shell when offline so client router can hydrate deep links.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\b/, /^\/__/],
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
