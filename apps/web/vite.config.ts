import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import babel from 'vite-plugin-babel'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  optimizeDeps: {
    exclude: ['simple-icons'],
  },
  server: {
    forwardConsole: false,
  },
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom', 'convex'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@convex': fileURLToPath(new URL('../../packages/backend/convex', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['@clerk/react-router', '@clerk/react', '@clerk/shared'],
    resolve: {
      conditions: ['module', 'browser', 'development'],
      externalConditions: ['node'],
    },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      filter: (id) =>
        /\.[jt]sx?$/.test(id) &&
        !id.includes('/node_modules/') &&
        (id.includes('/apps/web/') || id.includes('/packages/')),
      babelConfig: {
        presets: ['@babel/preset-typescript'],
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
        additionalManifestEntries: [{ url: '/index.html', revision: null }],
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{css,html,ico,js,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\b/, /^\/__/, /^\/assets\//, /\/[^/?]+\.[^/]+$/],
      },
    }),
  ],
})

export default config
