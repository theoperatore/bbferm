# Architecture

## Overview

BBFerm has three independently deployed application services. The browser-facing web application and BFF are a single TanStack Start service. The Tilt collector and SQLite-owning persistence API remain separate processes.

```text
Browser / installed PWA
        | HTTPS
        v
BBFerm Web — TanStack Start (SPA)
  - React client application
  - TanStack Router
  - TanStack Query
  - server functions / server routes (BFF)
        | loopback-only HTTP
        v
BBFerm Store — Fastify
  - domain API
  - SQLite connection, migrations, transactions
        ^
        | loopback-only HTTP
        |
BBFerm Collector — Node.js
  - BlueZ BLE advertisement listener
  - Tilt decoder and measurement submission
```

## Service 1: BBFerm Web (TanStack Start)

TanStack Start is both the web framework and the BFF. It includes TanStack Router and provides a server runtime for server functions, server routes, and middleware.

Run it in **SPA mode**. React renders in the browser; server-side rendering is not required. The Start server still runs in production to serve the client build and execute server-side operations.

Responsibilities:

- Serve the application shell, versioned assets, manifest, and service worker.
- Handle browser navigation through TanStack Router.
- Use TanStack Query for caching, polling, mutations, and invalidation.
- Authenticate browser sessions and authorize operations.
- Validate inputs and outputs at the BFF boundary.
- Call Store over loopback using server-only code and credentials.
- Return browser-facing DTOs without exposing internal service addresses or credentials.

Use Start server functions for UI-initiated operations. Use server routes when a conventional HTTP endpoint is useful, such as a health endpoint or a future integration endpoint. Keep Store client code in server-only modules. Never let browser code call Store directly.

## Service 2: BBFerm Collector (standalone Node.js)

Responsibilities:

- Listen continuously for Tilt BLE advertisements using Linux Bluetooth/BlueZ.
- Identify the Tilt device and decode gravity and temperature.
- Validate readings and preserve the raw advertisement payload.
- Record receive time and submit normalized measurements to Store.
- Recover from adapter/scanning errors and expose health through logs or a local status mechanism.
- Retry temporary Store failures with bounded backoff and a bounded queue.

The collector must not depend on an open browser or a running web service. It must not open SQLite. BLE broadcasts are transient; advertisements missed while the collector is offline cannot be replayed. Web deployments must never restart the collector.

## Service 3: BBFerm Store (standalone Fastify)

Responsibilities:

- Own the SQLite database connection and all SQL.
- Own migrations, transactions, constraints, and persistence-level domain invariants.
- Expose a small versioned internal REST API.
- Validate requests and return stable DTOs.
- Support idempotent measurement ingestion.
- Provide health and schema-version endpoints.

Only Store opens the SQLite file. Neither Start nor the collector may import the database driver or access the DB file directly.

## Communication flows

### Browser read/write

1. Browser calls a Start server function (or a Start server route).
2. Start authenticates the session and validates the request.
3. Start calls Store over loopback.
4. Store reads/writes SQLite and returns a DTO.
5. Start returns the browser-facing result.
6. TanStack Query caches results and refreshes or invalidates them as appropriate.

### Tilt measurement

1. Collector receives a BLE advertisement.
2. Collector records raw payload, device identity, and receive timestamp.
3. Collector decodes and validates the measurement.
4. Collector submits it to Store with an idempotency key.
5. Store commits the measurement to SQLite.
6. Start reads current/history data for the PWA.

## Network layout

Suggested ports:

| Process                 | Bind address  | Port |
| ----------------------- | ------------- | ---: |
| Caddy (HTTPS)           | LAN interface |  443 |
| TanStack Start          | `127.0.0.1`   | 3000 |
| Fastify Store           | `127.0.0.1`   | 3100 |
| Collector (health only) | `127.0.0.1`   | 3200 |

Only HTTPS is reachable from the LAN (Caddy also listens on port 80 to redirect to HTTPS). Internal service ports are loopback-only.

PWA service workers and `Secure` session cookies require a secure context, so plain HTTP is not sufficient. Each installation is served at `https://<install>.bbferm.example` with a publicly trusted Let's Encrypt certificate obtained via DNS-01; the hostname's A record points to the Pi's LAN IP, and the Pi keeps it up to date. Client devices need no certificate installation. See ADR-010 and `deployment.md`.

## PWA and offline behavior

PWA installation does not require SSR. The service worker should precache the app shell and versioned static assets. Do not indiscriminately cache authenticated API responses. Define offline reads and queued writes explicitly, preferably using IndexedDB for durable local data and an outbox for retryable commands. Display timestamps and stale/offline indicators when cached data is shown.

Validate the Start + PWA integration using a production build early. Do not assume a generic Vite PWA configuration works unchanged with every Start build setup.

## Deployment isolation

Use three systemd units:

- `bbferm-web.service` — TanStack Start application and BFF.
- `bbferm-collector.service` — BLE listener.
- `bbferm-store.service` — Fastify API and SQLite owner.

A web deployment restarts only `bbferm-web.service`. Collector and Store releases are independent. Store migrations require a separate, backed-up release step.
