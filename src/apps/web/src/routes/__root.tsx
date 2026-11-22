import '@mantine/core/styles.css'
import type { ReactNode } from 'react'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '../router'
import { theme } from './design/theme'
import { PwaUpdatePrompt } from './features/pwa-update/PwaUpdatePrompt'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#b45309' },
      { title: 'BBFerm' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

type RootDocumentProps = {
  children: ReactNode
}

function RootDocument(props: RootDocumentProps) {
  const { children } = props
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Outlet />
        <PwaUpdatePrompt />
      </MantineProvider>
    </QueryClientProvider>
  )
}
