# BBFerm

A local-first homebrewing application for recipe management, brew-day logging, and fermentation monitoring. BBFerm runs on a Raspberry Pi Zero 2 W on the home network, receives Tilt hydrometer Bluetooth Low Energy (BLE) advertisements, and presents brewing data through an installable Progressive Web App (PWA).

## Technology decisions

| Area                             | Choice                                                     |
| -------------------------------- | ---------------------------------------------------------- |
| Full-stack web framework and BFF | **TanStack Start**                                         |
| Rendering mode                   | **SPA mode**; SSR is not required                          |
| UI                               | React + TypeScript + Mantine                               |
| Routing                          | TanStack Router (included with Start)                      |
| Client server-state              | TanStack Query                                             |
| PWA                              | Web app manifest + service worker / Workbox integration    |
| Collector                        | Separate Node.js/TypeScript BLE listener                   |
| Persistence API                  | Separate Fastify service                                   |
| Database                         | SQLite, opened only by the persistence service             |
| API contracts                    | Owned and published by each API provider (Zod schemas)     |
| Process supervision              | systemd                                                    |
| Deployment                       | Direct Linux services; no Docker                           |

## Architecture

```text
Browser / installed PWA
        | HTTPS, same origin
        v
BBFerm Web — TanStack Start (SPA mode)
  - serves the client application and PWA assets
  - runs server functions and server routes
  - acts as the browser-facing BFF
        | loopback-only HTTP
        v
BBFerm Store — Fastify persistence API
  - sole owner of SQLite, migrations, and transactions
        ^
        | loopback-only HTTP
        |
BBFerm Collector — standalone Node.js BLE listener
  - continuously receives Tilt advertisements
  - submits measurements to Store
```

There are **three independently managed services**. TanStack Start combines the web application and BFF into one service; there is no separate BFF process. The collector remains independent so web deployments cannot interrupt BLE reception. Store remains independent and is the only process that opens SQLite.

The browser talks only to TanStack Start. Start and the collector talk to Store over an internal interface. Neither Store nor the collector is exposed to the LAN.

## Project goals

- Fast, lightweight installable PWA.
- Continuous Tilt collection independent of browser sessions.
- Browser-facing BFF with authentication and validation.
- One authoritative owner for SQLite and domain persistence.
- Useful offline app-shell behavior and deliberately designed offline data operations.
- Secure home-network deployment with HTTPS.
- Repeatable, independently deployable services.

## Hardware

- Raspberry Pi Zero 2 W (512 MB RAM), Raspberry Pi OS Lite 64-bit.
- UCTRONICS PoE-to-micro-USB Ethernet adapter.
- UniFi USW Flex 2.5G 8 PoE switch.
- Official Raspberry Pi 256 GB microSD card.
- Tilt hydrometer(s), received using onboard Bluetooth LE.

Cloud synchronization, remote access, Docker, and automated CI/CD are also out of the initial release scope.

## Getting started

Requires Node.js 24 (`.nvmrc`) and pnpm 10.

```sh
pnpm install
cp src/services/store/server/.env.example src/services/store/server/.env
cp src/services/collector/.env.example src/services/collector/.env
cp src/apps/web/.env.example src/apps/web/.env

pnpm dev:store       # Fastify Store on 127.0.0.1:3100 (in-memory until the SQLite driver is chosen)
pnpm dev:collector   # replays captured Tilt advertisements into Store
pnpm dev:web         # TanStack Start on 127.0.0.1:3000
```

```sh
pnpm typecheck && pnpm test && pnpm build
pnpm --filter @bbferm/web start   # serve the production web build (PWA + BFF)
```

| Path | Package | Purpose |
| --- | --- | --- |
| `src/apps/web` | `@bbferm/web` | TanStack Start SPA + BFF, Mantine, TanStack Query, PWA |
| `src/services/store/server` | `@bbferm/store` | Fastify internal API (`/internal/v1`), sole SQLite owner |
| `src/services/store/contract` | `@bbferm/store-contract` | Store's published API schemas (Zod only), used by the BFF and collector |
| `src/services/collector` | `@bbferm/collector` | Tilt BLE listener (decoder, replay source, Store submitter) |
| `src/packages/domain` | `@bbferm/domain` | Framework-independent brewing logic and value types (IDs, timestamps, gravity) |
| `src/packages/config` | `@bbferm/config` | Shared TypeScript presets |

Workspace packages export TypeScript source under the `@bbferm/source` condition (used by Vite and `tsx` in dev) and compiled `dist/` otherwise (used by the built services).

## Documentation

- [Architecture and service boundaries](docs/architecture.md)
- [Technology choices and repository structure](docs/technology.md)
- [Domain model](docs/data-model.md)
- [API contracts](docs/api-contracts.md)
- [Development workflow](docs/development.md)
- [Deployment](docs/deployment.md)
- [Security and operations](docs/security-operations.md)
- [Architecture decisions](docs/decisions.md)
- [Implementation plan](docs/implementation-plan.md)

## First milestone

Build a production-shaped proof of concept: TanStack Start in SPA mode, a server function calling a mock Store API, and a working installable PWA. Validate the production build and service-worker behavior before building out the full application.
