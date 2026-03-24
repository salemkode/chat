import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { ThemeProvider } from '@/components/theme-provider'
import appCss from '@/styles.css?url'

export const Route = createRootRouteWithContext()({
  ssr: false,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Chat App',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument() {
  const [showDevtools, setShowDevtools] = useState(false)

  useEffect(() => {
    setShowDevtools(import.meta.env.DEV)
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider>
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
          </ThemeProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
