import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexHttpClient } from 'convex/browser';
import { ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'

export const httpClient = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL as string);
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// localStorage adapter for Convex Auth
const localStorageAdapter = {
  getItem: (key: string) => {
    return Promise.resolve(localStorage.getItem(key))
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    return Promise.resolve()
  },
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex} storage={localStorageAdapter}>
      {children}
    </ConvexAuthProvider>
  )
}
