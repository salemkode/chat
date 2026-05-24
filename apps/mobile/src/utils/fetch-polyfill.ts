// Do not import InitializeCore here — expo-router/entry already initializes the runtime.
// Re-importing it can overflow the native stack before AppRegistry runs.
// This file configures the runtime environment to increase compatibility with WinterCG.
// https://wintercg.org/
import Constants from 'expo-constants'

import { fetch } from 'expo/fetch'

interface ExpoExtraRouterConfig {
  router?: {
    origin?: unknown
    generatedOrigin?: unknown
  }
}

const manifest = Constants.expoConfig

const polyfillSymbol = Symbol.for('expo.polyfillFetchWithWindowLocation')

type FetchWithMarker = typeof globalThis.fetch & { [polyfillSymbol]?: boolean }
type MutableRequestInput = { url: string }

function hasMutableRelativeUrl(input: unknown): input is MutableRequestInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    'url' in input &&
    typeof input.url === 'string' &&
    input.url.startsWith('/')
  )
}

function wrapFetchWithWindowLocation(fetch: FetchWithMarker) {
  if (fetch[polyfillSymbol]) {
    return fetch
  }

  const _fetch: FetchWithMarker = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      return fetch(new URL(input, getOrigin()).toString(), init)
    }

    if (hasMutableRelativeUrl(input)) {
      return fetch(new URL(input.url, getOrigin()).toString(), init)
    }

    return fetch(input, init)
  }

  _fetch[polyfillSymbol] = true

  return _fetch
}

const extra = manifest?.extra as ExpoExtraRouterConfig | null

function getOrigin() {
  assertOrigin()
  return window.location?.origin
}

function assertOrigin() {
  // We use the dev server in development but should attempt to warn early if the origin will be disabled in production.
  if (extra?.router?.origin === false) {
    throw new Error(
      'The server origin cannot be false in the app.json. Setup server deployments to ensure production fetch requests work https://docs.expo.dev/router/reference/api-routes/#native-deployment',
    )
  }
  if (typeof window !== 'undefined' && !window.location) {
    throw new Error(
      'window.location is not defined. Setup server deployments to ensure relative fetch requests work in production https://docs.expo.dev/router/reference/api-routes/#native-deployment',
    )
  }
}

// Defer the assertion in release builds so the app doesn't crash instantly.
if (__DEV__) assertOrigin()

// Polyfill window.location in native runtimes.
if (typeof window !== 'undefined') {
  // Polyfill native fetch to support relative URLs
  Object.defineProperty(globalThis, 'fetch', {
    value: wrapFetchWithWindowLocation(fetch),
  })
}
