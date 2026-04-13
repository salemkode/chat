import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { useEffect, useState } from 'react'
import { ClerkProvider } from '@clerk/react-router'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexClientProvider } from '@/components/convex-client-provider'
import { HotkeysProvider } from '@/components/hotkeys-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { getRequiredEnv } from '@/lib/parsers'
import appCss from '@/styles.css?url'

export const links = () => [{ rel: 'stylesheet', href: appCss }]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="description" content="Salemkode Chat" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Salemkode Chat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <title>Chat App</title>
        <script src="/theme-init.js" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function HydrateFallback() {
  return <div className="min-h-screen w-full bg-[#050505]" />
}

export default function App() {
  const [showDevtools, setShowDevtools] = useState(false)

  useEffect(() => {
    setShowDevtools(import.meta.env.DEV)
  }, [])

  return (
    <ClerkProvider publishableKey={getRequiredEnv(import.meta.env, 'VITE_CLERK_PUBLISHABLE_KEY')}>
      <ThemeProvider>
        <HotkeysProvider>
          <ConvexClientProvider>
            <Outlet />
            {showDevtools ? (
              <TanStackDevtools
                config={{
                  position: 'bottom-right',
                }}
              />
            ) : null}
          </ConvexClientProvider>
        </HotkeysProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack ? (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  )
}
