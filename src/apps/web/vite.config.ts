import { type Plugin, defaultClientConditions, defaultServerConditions, defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { VitePWA, type VitePluginPWAAPI } from 'vite-plugin-pwa'

/**
 * Start builds the client and server environments and then prerenders the SPA
 * shell (`/_shell.html`). vite-plugin-pwa normally generates the service worker
 * in `closeBundle`, which runs before the shell exists. Regenerate it after
 * Start's `buildApp` completes so the shell is precached as the navigation
 * fallback.
 */
function pwaAfterStartBuild(pwaPlugins: Plugin[]): Plugin {
  const api = pwaPlugins.find((p) => p.name === 'vite-plugin-pwa')?.api as VitePluginPWAAPI | undefined
  if (!api) throw new Error('vite-plugin-pwa API not found')
  return {
    name: 'bbferm:pwa-after-start-build',
    apply: 'build',
    // Start's prerender runs in an `enforce: 'post'`, `order: 'post'` buildApp hook;
    // this plugin is registered after it, so it runs once the shell exists.
    enforce: 'post',
    buildApp: { order: 'post', handler: () => api.generateSW() },
  }
}

const pwa = VitePWA({
  outDir: 'dist/client',
  registerType: 'prompt',
  injectRegister: false,
  manifest: {
    name: 'BBFerm',
    short_name: 'BBFerm',
    description: 'Homebrew recipes, brew days, and fermentation monitoring',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#b45309',
    background_color: '#1a1b1e',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  // Manifest + its icons are precached automatically; add the remaining static assets.
  includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
  workbox: {
    // App shell only. Server functions and API routes are never cached.
    globPatterns: ['**/*.{js,css,html}'],
    navigateFallback: '/_shell.html',
    navigateFallbackDenylist: [/^\/_serverFn\//, /^\/api\//],
    runtimeCaching: [],
  },
})

export default defineConfig({
  server: { port: 3000, host: '127.0.0.1' },
  // Consume workspace packages (@bbferm/*) from TypeScript source.
  resolve: { tsconfigPaths: true, conditions: ['@bbferm/source', ...defaultClientConditions] },
  ssr: { resolve: { conditions: ['@bbferm/source', ...defaultServerConditions] } },
  plugins: [
    // SPA mode: React renders in the browser; the Start server still serves
    // the shell and runs server functions / server routes (the BFF).
    // `features/` and `design/` folders are colocated in src/routes and must not become routes.
    tanstackStart({ spa: { enabled: true }, router: { routeFileIgnorePattern: '^(features|design)$' } }),
    // React's Vite plugin must come after Start's.
    viteReact(),
    pwa,
    pwaAfterStartBuild(pwa),
  ],
})
