import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const require = createRequire(import.meta.url)
const dayjsEsmIndex = require.resolve('dayjs/esm/index.js')
const braintreeCjsEntry = require.resolve('@braintree/sanitize-url/dist/index.js')
const braintreeSanitizeUrlShim = fileURLToPath(
  new URL('./braintree-sanitize-url-shim.ts', import.meta.url),
)

// Mermaid → dayjs: Vite prebundles `main` (UMD `dayjs.min.js`) and ESM default import fails in dev.
// Only rewrite the bare specifier `dayjs` (regex), not `dayjs/plugin/...` (vitepress-plugin-mermaid maps those to /esm/).
// Renders ```mermaid blocks as diagrams (research/*.md). See vitepress-plugin-mermaid.
export default withMermaid(
  defineConfig({
    title: 'Salemkode Chat',
    description: 'Architecture and research documentation',
    cleanUrls: true,
    // Research pages link to monorepo paths (../../apps/...) for GitHub browsing; not part of this static site.
    ignoreDeadLinks: true,
    vite: {
      resolve: {
        alias: [
          { find: /^dayjs$/, replacement: dayjsEsmIndex },
          // Internal: absolute CJS file for the shim (avoid aliasing `@braintree/sanitize-url` to shim then importing self).
          { find: /^@braintree\/sanitize-url-cjs$/, replacement: braintreeCjsEntry },
          // CJS-only package; Mermaid uses named ESM import — shim applies interop (see braintree-sanitize-url-shim.ts).
          { find: /^@braintree\/sanitize-url$/, replacement: braintreeSanitizeUrlShim },
        ],
      },
    },
    themeConfig: {
      nav: [
        { text: 'Agent notes', link: '/agent' },
        { text: 'Architecture', link: '/architecture' },
        { text: 'Deploy', link: '/cloudflare-pages' },
        { text: 'Research', link: '/research/README' },
      ],
      sidebar: [
        { text: 'Home', link: '/' },
        { text: 'Agent notes (AI)', link: '/agent' },
        { text: 'Architecture', link: '/architecture' },
        { text: 'Cloudflare Pages', link: '/cloudflare-pages' },
        {
          text: 'Research',
          items: [
            { text: 'Overview', link: '/research/README' },
            { text: '01 — System thesis', link: '/research/01-system-thesis' },
            { text: '02 — Context assembly', link: '/research/02-context-assembly' },
            { text: '03 — Memory system', link: '/research/03-memory-system' },
            { text: '04 — Local-first', link: '/research/04-local-first' },
            { text: '05 — Model routing', link: '/research/05-model-routing' },
            { text: '06 — Experience values', link: '/research/06-experience-values' },
          ],
        },
      ],
      socialLinks: [],
      footer: {
        message: 'Docs live in-repo under docs/',
      },
    },
  }),
)
