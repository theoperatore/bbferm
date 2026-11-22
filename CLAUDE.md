# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BBFerm is a local-first homebrewing app running on a Raspberry Pi Zero 2 W (512 MB RAM). The design docs in `docs/` are the source of truth; read `docs/architecture.md` and `docs/decisions.md` before making structural changes.

## Commands

Node 24 (`.nvmrc`), pnpm 10. Run from the repo root.

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # everything
pnpm format                                    # Biome: format, sort imports, apply safe lint fixes
pnpm dev:store | pnpm dev:collector | pnpm dev:web
pnpm --filter @bbferm/collector exec vitest run test/decode.test.ts -t "Tilt Pro"   # single test
pnpm --filter @bbferm/web start                # serve the production web build (127.0.0.1:3000)
```

Each service loads its own `.env` with dotenv (`config({ quiet: true })`, which never overrides variables already set; on the Pi, systemd's `EnvironmentFile` wins). Don't pass `--env-file` flags. Local dev needs each service's `.env` copied from its `.env.example` (`src/services/store/server`, `src/services/collector`, `src/apps/web`). The collector replays fixtures from `test/fixtures/advertisements.json` by default; BLE (`COLLECTOR_SOURCE=bluez`) is not implemented yet.

## Architecture

Three independently deployed services; the browser only ever talks to web:

```text
browser ──▶ web (TanStack Start, SPA mode: UI + BFF) ──▶ store (Fastify, sole SQLite owner) ◀── collector (Tilt BLE)
```

- Web deploys must never restart the collector (BLE advertisements missed while it's down are lost forever).
- Only Store may open SQLite or import a DB driver. Store and collector are loopback-only; the web server binds `127.0.0.1` (srvx defaults to all interfaces, so keep `--host` in the start script).
- Store currently uses an in-memory database behind the `MeasurementStore` DAO interface; the SQLite driver and BLE library are deliberately unchosen until tested on the Pi.

### Schema ownership (ADR-009)

Each API provider owns and publishes its schema; there is no shared cross-service schema package.

- Store publishes `@bbferm/store-schema` (`src/services/store/schema`), consumed by the BFF and collector. It must depend only on `zod` and `@bbferm/domain` so consumers never install Fastify or the DB driver.
- The BFF owns browser schemas in `*.schemas.ts` files inside its feature modules and maps Store DTOs to them in `*.functions.ts`. UI code must never import `@bbferm/store-schema`; Store shapes and raw sensor payloads must not reach the browser.
- Shared value types (Id, UtcTimestamp, SpecificGravity, MeasurementSource, QualityFlag) live in `@bbferm/domain`.
- `/internal/v1` must stay backward compatible because services deploy independently. Adding fields is safe; removing or renaming needs `/internal/v2`.

### Store

Store has its own ground rules in `src/services/store/CLAUDE.md`. They cover the `handlers/` → `services/` → `stores/` and `clients/` layering, construction order in `main.ts`, and health becoming `serving` only after startup.

### Collector

The collector mirrors Store's layering for BLE input; its rules are in `src/services/collector/CLAUDE.md`.

### Web app

The web app has its own ground rules in `src/apps/web/CLAUDE.md`. They cover folder organization (`features/` and `design/` at the nearest common parent; no `components/`, `lib/` or `utils/`), the TypeScript and React conventions, the BFF file suffixes, and the PWA build workaround.

## Conventions

Biome (`biome.json`) handles formatting and linting. Custom rules live as GritQL plugins in `biome/`. It enforces:

- camelCase file names (PascalCase also allowed for `.tsx` components)
- no return-type annotations, and no destructured component props in the parameter list (both via plugins)
- no imports from `utils`/`lib`/`helpers` folders or `types` files
- no `@bbferm/store-schema` imports in web UI code (only `src/clients/**` and `*.functions.ts`)
- no default exports outside `*.config.*`, and no barrel files outside package entry points

A lefthook pre-commit hook (`lefthook.yml`, installed by `pnpm install`) runs `biome check` on staged files and blocks the commit on lint or formatting errors. It doesn't modify files. Fix violations; don't suppress them, and don't bypass the hook with `--no-verify`. Biome's "safe" fix for an empty `interface` would turn the `I<Name>Request` interfaces in `clients/` into types, so that rule is off there.

- **Files and folders are always camelCase** (`measurementService.ts`, `features/latestReadings/`), never kebab-case or snake_case. Exceptions:
  - Component files are named after the component they export (`LatestReadings.tsx`).
  - Names a tool requires or generates: `pwa-assets.config.ts`, the generated PWA icons in `src/apps/web/public/`, `routeTree.gen.ts`, `pnpm-workspace.yaml`, `.env.example`.

## Gotchas

- **Workspace package resolution:** packages export TS source under the custom `@bbferm/source` condition and compiled `dist/` otherwise. Vite (`vite.config.ts`), vitest (`vitest.config.ts` per package) and `tsx --conditions=@bbferm/source` use source; built services run `node dist/main.js` and need `pnpm build` of their dependencies first. A new package needs the same `exports` shape, and a new consumer needs the condition configured.
- **Pi deployment:** never copy macOS `node_modules` or native `.node` modules to the Pi; native deps must be installed for Linux ARM64.
- **Measurements:** the collector generates the measurement `id` once and reuses it across retries (it's Store's idempotency key). Store receive time is `receivedAt`; Tilt packets have no trustworthy sample timestamp, so `observedAt` stays null. Temperatures are stored in Celsius, gravity as a decimal SG (`1.048`). Raw values are preserved alongside normalized ones; suspicious readings are kept with `qualityFlags`, not dropped.
