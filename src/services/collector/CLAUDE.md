# Collector ground rules

The collector follows the same layering as Store (see `src/services/store/CLAUDE.md`), adapted for an inbound stream of BLE advertisements instead of HTTP requests. It has no inbound listener and must never open SQLite.

```text
src/
├── main.ts       composition root
├── ble/          advertisement sources (replay for dev, BlueZ on the Pi), the collector's "server"
├── handlers/     inbound advertisement handler: parse/validate, then delegate
├── services/     business logic: readings → measurements, submission with backoff, health
├── stores/       submission queue (in memory; a disk spool would be another implementation)
├── clients/      upstream calls; clients/store/ has client.ts plus one RPC function per file
└── tilt/         Tilt iBeacon decoding, colors, device IDs
```

- **`handlers/`**: parse and validate the advertisement (`decodeTilt`), ignore anything that isn't a Tilt reading, and delegate to a service. No business logic.
- **`services/`**: assume input is already validated.
  - `readingService` applies the per-Tilt throttle, sets quality flags, converts to Celsius, and builds the measurement. It generates the measurement ID once; that ID is Store's idempotency key.
  - `submissionService` delivers measurements in order with bounded backoff, keeps the same ID across retries, and drops measurements Store rejects (400) so they don't block the queue.
- **`stores/`**: `SubmissionQueueStore` is the DAO interface services depend on. Use "store" naming, never "repository".
- **`clients/store/`**: `client.ts` exports `createStoreClient(deps)` and maps failures to `StoreRejectedError` (400, don't retry) or `StoreUnavailableError` (retry). Each RPC file exports an `I<Name>Request` interface, a standalone `<Name>Response` type, and a `create<Name>(deps)` factory that returns `async function <name>(request)`.
  - **Difference from the web app:** the web app's clients are lazy singletons, because TanStack Start has no composition root. Here, `main.ts` constructs clients and injects them like everything else.
- Never create `utils/`, `lib/`, `helpers/` or generic `types.ts` files.

## Construction (`main.ts`)

1. Read configuration (`loadConfig()` loads `.env` with dotenv and validates it).
2. Create clients, then RPC functions.
3. Create stores.
4. Create services.
5. Create the advertisement handler and pick the source (`COLLECTOR_SOURCE`).
6. Start the source, **then** set health to `serving`. There's no HTTP endpoint, so health changes are logged to journald. On SIGINT/SIGTERM, set health to `not_serving`, stop submission, and stop the source.

Every piece is a factory taking a single `deps` object. Nothing reads `process.env` outside `config.ts`. Return types are inferred; annotate variables to give values a schema type.

Web deployments must never restart the collector: BLE advertisements missed while it's down are lost forever.
