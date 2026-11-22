# Collector ground rules

The collector will listen for Tilt BLE advertisements and submit measurements to Store. **Right now it only serves health** (`GET /health` on `127.0.0.1:3200`). It must never open SQLite.

**Make no assumptions about the Tilt advertisement format or the measurement interaction yet.** The BLE library must first be validated on the Pi, and the format derived from real captured advertisements (M4). Don't add decoding, device mapping, or submission logic until those `TODO(M4)` steps in `src/main.ts` are done.

## Structure

It follows Store's layering (`src/services/store/CLAUDE.md`):

- **`handlers/`** handle inbound input. For HTTP that's routes; for BLE it will be the advertisement stream. They parse and validate, then delegate. No business logic.
- **`services/`** hold business logic.
- **`stores/`** hold DAOs (e.g. a submission queue or disk spool, if M4 needs one). Use "store" naming, never "repository".
- **`clients/<service>/`**: upstream calls. `clients/store/client.ts` will build on `@bbferm/http-client`, with one RPC function per file. Here `main.ts` constructs clients and injects them, rather than using lazy singletons as the web app does.

The HTTP server, health checks and start/stop handling come from `@bbferm/http-server`.

## Construction (`main.ts`)

1. Configuration (`loadConfig()` loads `.env` with dotenv and validates it).
2. Clients.
3. Stores.
4. Services.
5. Handlers registered to routes (and later to the BLE advertisement source).
6. `startHttpServer`: listen, then `serving`. SIGINT/SIGTERM sets `not_serving` and closes.

Web deployments must never restart the collector: BLE advertisements missed while it's down are lost forever.
