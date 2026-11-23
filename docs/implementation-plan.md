# Implementation plan

## Milestone 1: TanStack Start + PWA proof of concept

- Create pnpm workspace and `src/apps/web` TanStack Start app.
- Configure SPA mode; SSR is not a requirement.
- Add Mantine and TanStack Query.
- Add a server-only Store client with runtime validation.
- Implement a server function calling a mock Store API.
- Build a simple page that displays the result through TanStack Query.
- Add manifest, icons, and service worker / Workbox integration.
- Verify production build, installation, offline app shell, update behavior, and asset paths.
- Confirm server secrets are absent from client assets.

**Exit criteria:** One Start web service serves the PWA and executes the BFF operation; the installed app shell loads offline.

## Milestone 2: Pi deployment foundation

- Install Raspberry Pi OS Lite 64-bit.
- Configure Ethernet, hostname, SSH keys, Bluetooth, and Tailscale for administrator access.
- Install pinned Node runtime.
- Register the dedicated BBFerm domain and DigitalOcean DNS; create a per-install scoped token.
- Build Caddy with the DigitalOcean DNS module; serve `https://<install>.bbferm.example` with a DNS-01 certificate (ADR-010).
- Add `bbferm-dns.timer` to keep the A record pointed at the Pi's LAN IP.
- On real devices over HTTPS, verify PWA install (iOS Safari, Android Chrome, desktop), offline app shell, update prompt, asset paths, and manifest content type.
- Create service accounts and filesystem layout.
- Deploy Start under `bbferm-web.service`.
- Validate reboot, logs, memory use, and rollback.

## Milestone 3: Store and SQLite

- Implement Fastify Store.
- Select/test SQLite driver on Pi.
- Add migrations, foreign keys, WAL, transactions, and health endpoints.
- Implement recipes, batches, devices, events, and measurement endpoints.
- Add idempotent ingestion and backup/restore.

## Milestone 4: Tilt collector

- Implement standalone BLE listener.
- Validate BlueZ library and scanning on Pi.
- Decode advertisements and preserve raw payload/receive time.
- Submit measurements to Store.
- Add bounded retries, health reporting, logs, and systemd restart policy.
- Verify web releases do not interrupt collection.

## Milestone 5: Brewing workflows

- Recipes and targets.
- Batch lifecycle and brew-day events.
- Manual readings and Tilt assignment history.
- Fermentation dashboard and history charts.
- TanStack Query polling/invalidation.
- Stale/offline/collector-unavailable states.

## Milestone 6: Offline and operational hardening

- Define offline-readable data and queueable commands.
- Add IndexedDB and idempotent outbox replay where justified.
- Test network loss, service restarts, power interruption, disk pressure, and recovery.
- Verify backup restoration and document operations.

## Release isolation

- Web release: restart only `bbferm-web.service`.
- Collector release: restart only `bbferm-collector.service`.
- Store release/migration: separate operation with verified backup.
