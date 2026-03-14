import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'

import tailwindcss from '@tailwindcss/vite'

const tanstackEventBusEnabled =
  process.env.TANSTACK_DEVTOOLS_EVENT_BUS === '1'
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
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      quoteStyle: 'single',
      semicolons: false,
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
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
