import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
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
  ],
})

export default config
