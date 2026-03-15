import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { ThemeProvider } from '@/components/theme-provider'
import appCss from '@/styles.css?url'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider>
          <ThemeProvider>
            <ConvexClientProvider>
              <Outlet />
              <TanStackDevtools
                config={{
                  position: 'bottom-right',
                }}
              />
            </ConvexClientProvider>
          </ThemeProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
