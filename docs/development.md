# Local development

## Environment
Develop on macOS Apple Silicon (M4). Use a pinned Node.js LTS version, pnpm workspaces, TypeScript strict mode, and one lockfile.

## Repository boundaries
- `apps/web`: TanStack Start application, client UI, and server/BFF code.
- `services/collector`: standalone Tilt BLE listener.
- `services/store`: standalone Fastify API and sole SQLite owner.
- `packages/contracts`: runtime schemas and DTOs.
- `packages/domain`: framework-independent domain logic.

## Local process workflow
1. Run Store with a local development SQLite database.
2. Run Start with a server-only Store base URL pointing to Store.
3. Run collector only when testing actual BLE hardware; use captured fixtures or a replay source for ordinary development.
4. Access all application data through Start server functions/routes from the browser. Do not call Store directly from the client, even in development.

## Start conventions
- Server functions for UI-initiated operations.
- Server routes for conventional HTTP endpoints when needed.
- Store client code and credentials in server-only modules.
- Runtime-validate requests and responses.
- Use TanStack Query for browser cache, polling, mutations, and invalidation.
- Keep secrets out of `VITE_*` variables and client bundles.

## PWA testing
Test the production build, not only the dev server:
- Manifest and icons.
- Installability on target browsers.
- Offline app-shell load.
- Correct asset paths behind the reverse proxy.
- Service-worker updates and cache invalidation.
- No accidental caching of authenticated API responses.
- Clear stale/offline UI.

## Tests
- Unit-test Tilt decoding with captured advertisement fixtures.
- Test domain rules and normalization.
- Test Store API contracts and idempotent ingestion.
- Test Start server functions against a mock Store API.
- Inspect client bundles for secrets and server-only imports.
- Test production artifacts on the Pi.

## Native modules
Do not copy macOS `node_modules` to the Pi. Native modules must be built/installed for Linux ARM64. Validate the SQLite driver and BLE dependencies on the actual Pi early.
