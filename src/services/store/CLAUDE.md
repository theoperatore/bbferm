# Store ground rules

Store is two packages:

- **`schema/`** (`@bbferm/store-schema`): Store's published API schema, made of Zod schemas, inferred types, and route paths. Consumers (web BFF, collector) import only this. It may depend only on `zod` (and `@bbferm/domain`).
- **`server/`** (`@bbferm/store`): the Fastify service and the only process that opens SQLite.

## Server abstractions

```text
server/src/
├── main.ts       composition root
├── handlers/     one per route: authentication + request validation, then delegate
├── services/     business logic
├── stores/       database connections and DAOs
├── clients/      upstream calls, one sub-folder per upstream service (none yet)
└── auth/         caller authentication used by handlers (M3)
```

Server setup, health checks, the error envelope and start/stop handling come from `@bbferm/http-server` (see the root `CLAUDE.md`). Don't re-implement them here.

- **`handlers/`**: one file per route, named after the operation (e.g. `ingestMeasurement.ts`). A handler authenticates and authorizes the caller (`auth.authorize`), validates and parses the request with the `@bbferm/store-schema` schema, calls services, and shapes the HTTP response (status code, body typed with the schema's response type). **No business logic.** Each handler file exports a `create<Name>Handler(deps)` factory that returns a Fastify route (`{ method, url, handler } satisfies RouteOptions`).
- **`services/`**: core business logic. Services assume the caller is already authenticated and authorized and the request is already validated, so they don't check again. They can call stores, clients, and other services. They know nothing about HTTP.
- **`stores/`**: database connections and DAOs (data access objects). Persistence only: queries, inserts, transactions. Each DAO defines an interface (e.g. `MeasurementStore`) that services depend on, so implementations can change without touching services. **Use "store" naming, never "repository".**
- **`clients/`**: calls to upstream services, one sub-folder per service, structured like the web app's `src/clients/` (a `client.ts` built on `@bbferm/http-client`, plus one RPC function per file).
- Other folders are fine when they're descriptive (`auth/`). **Never create `utils/`, `lib/`, `helpers/` or generic `types.ts` files.** Name folders and files after what they contain.

## Construction (`main.ts`)

All wiring happens in `main.ts`, in this order:

1. Read environment configuration (`loadConfig()`, which loads `.env` with dotenv and validates it).
2. Create clients.
3. Create stores (connections, then DAOs).
4. Create services from stores, clients, and other services.
5. Create the server (`createHttpServer`) and handlers from services; register each handler as a route, including `createGetHealthHandler`.
6. Call `startHttpServer`, which listens and **then** sets health to `serving`.

Every piece is a factory that takes its dependencies as a single `deps` object. Nothing constructs its own dependencies or reads `process.env` outside `config.ts`.

Health starts `not_serving` (HTTP 503) and flips to `serving` only after `listen()` resolves. On SIGINT/SIGTERM it returns to `not_serving` before the server closes.

Tests build the same graph without listening (see `server/test/app.test.ts`) and exercise routes with `server.inject`. Keep that wiring in step with `main.ts`. They also check that responses parse with `@bbferm/store-schema`, so the published schema can't drift from what the server returns.

## Conventions

- Types come from the schema package (`z.infer`) or are inferred from implementations (`export type MeasurementService = ReturnType<typeof createMeasurementService>`). Don't annotate function return types. To give a value a schema type, annotate the variable instead (`const body: StoreStatusResponse = ...`).
- Errors use the shared envelope via `sendError` from `@bbferm/http-server`, with codes listed in `@bbferm/store-schema`. Never return stack traces, SQL, paths, or secrets.
- `/internal/v1` must stay backward compatible (see the root `CLAUDE.md`).
