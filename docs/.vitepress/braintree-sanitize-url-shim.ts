/**
 * @braintree/sanitize-url ships CJS only; Mermaid uses `import { sanitizeUrl }`.
 * Namespace import lets Vite/Rollup apply CJS interop for the browser bundle.
 * Import via `@braintree/sanitize-url-cjs` (see config alias) to avoid circular resolution.
 */
import * as pkg from '@braintree/sanitize-url-cjs'

export const sanitizeUrl = pkg.sanitizeUrl as (url?: string) => string
