# Technology choices

## TanStack Start: web framework and BFF

**Decision: use TanStack Start in SPA mode.**

Start is the full-stack framework for the browser-facing application. It includes TanStack Router and adds the server runtime, server functions, server routes, and middleware. The Start server serves the built client application and executes BFF operations.

SPA mode means the UI renders client-side. It does not mean the server runtime disappears. SSR is not needed for BBFerm's private home-network application, but server functions and server routes remain useful.

### Responsibilities

- **TanStack Start:** web server, BFF, server functions, server routes, middleware.
- **TanStack Router:** navigation, route definitions, route loaders, search params.
- **TanStack Query:** browser-side server-state cache, polling, mutations, invalidation.
- **Mantine:** UI components and design system.
- **PWA service worker:** installability, app-shell caching, explicit offline behavior.

Use Start server functions for UI-initiated backend operations. Use server routes for conventional HTTP endpoints where appropriate. Keep Store calls and secrets in server-only modules. Do not expose Store URLs or credentials to the browser.

TanStack Query is still useful with Start: server functions provide the call boundary, while Query manages caching and refresh behavior.

## PWA

Use a manifest and service worker, likely with Workbox tooling. Confirm compatibility with the chosen TanStack Start version and production build pipeline in the first milestone. Test installation, app-shell caching, update lifecycle, and offline behavior. A service worker does not make backend APIs available offline.

## Independent backend services

### Collector

Standalone Node.js/TypeScript process. Listens for Tilt BLE advertisements through Linux BlueZ and submits measurements to Store. Test the selected BLE library on the actual Pi early.

### Store

Standalone Fastify service. Owns SQLite, migrations, transactions, and persistence DTOs. It is the only process allowed to open the database.

### Shared packages

Use pnpm workspaces. API schemas are owned by the provider of each API, not by a shared package (see [API contracts](api-contracts.md#schema-ownership)):

- Store publishes `@bbferm/store-schema`, consumed by the BFF and the collector.
- The BFF's browser-facing schemas live in `*.schemas.ts` files in the web app's feature modules, consumed by the UI.

Shared value types (IDs, UTC timestamps, specific gravity) and framework-independent domain logic live in `@bbferm/domain`.

## Suggested monorepo

```text
bbferm/
├── README.md
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── src/
│   ├── apps/
│   │   └── web/             # TanStack Start: SPA + BFF
│   ├── services/
│   │   ├── collector/       # standalone BLE listener
│   │   └── store/
│   │       ├── schema/      # Store's published API schema
│   │       └── server/      # Fastify + SQLite
│   └── packages/
│       ├── domain/          # domain logic and value types
│       ├── httpServer/      # shared Fastify server: health, error envelope, start/stop
│       ├── httpClient/      # shared fetch client for service-to-service calls
│       └── config/
└── scripts/
    ├── build-release.sh
    ├── deploy-release.sh
    └── rollback-release.sh
```

## Raspberry Pi compatibility

The Pi Zero 2 W has 512 MB RAM. Keep services small and avoid unnecessary runtime dependencies. Build the browser assets on the M4 Mac. macOS ARM64 and Linux ARM64 are different binary targets: never copy macOS `node_modules` or native `.node` modules to the Pi. Install/build native dependencies in a compatible Linux ARM64 environment or on the Pi in a controlled setup.

Select the SQLite driver after testing it on Raspberry Pi OS 64-bit. Pin Node.js and pnpm versions.

## References

- TanStack Start: https://tanstack.com/start/latest/docs/framework/react/overview
- TanStack Start SPA mode: https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode
- TanStack Router: https://tanstack.com/router/latest/docs
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- PWA / Workbox: https://vite-pwa-org.netlify.app/
- Fastify: https://fastify.dev/docs/latest/
