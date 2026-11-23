# Architecture decisions

## ADR-001: Local-first Raspberry Pi deployment

**Decision:** First release runs on a Raspberry Pi Zero 2 W and is reachable only on the home network.

## ADR-002: TanStack Start as the web application and BFF

**Decision:** Use TanStack Start in SPA mode. The Start server serves the client application and provides the browser-facing BFF through server functions and server routes.

**Rationale:** Start includes TanStack Router and adds server capabilities. It avoids a separate web/BFF process while preserving a clear boundary between browser code and internal services. SSR is not required.

**Consequences:**

- Web UI and BFF deploy together as `bbferm-web.service`.
- Browser calls Start server functions or server routes.
- Start calls Store over loopback.
- Server-only code and credentials must never enter the client bundle.
- PWA integration must be tested against the production build early.

## ADR-003: Separate collector

**Decision:** Run the Tilt BLE listener as its own Node.js service.

**Rationale:** BLE collection must continue with no browser open and must not be interrupted by web deployments.

## ADR-004: Separate persistence API owns SQLite

**Decision:** Use a Fastify Store service as the sole owner of SQLite.

**Rationale:** One service centralizes SQL, migrations, transactions, idempotency, and domain persistence rules. Start and collector communicate with Store through a versioned internal API.

## ADR-005: SQLite initially

**Decision:** Use SQLite with migrations, foreign keys, WAL, and safe backup procedures. Use UUIDs, UTC timestamps, and stable DTOs to leave room for future migration/sync.

## ADR-006: No Docker initially

**Decision:** Deploy directly to Raspberry Pi OS using systemd. Avoid container overhead and extra operational layers for this small host.

## ADR-007: PWA with explicit offline behavior

**Decision:** Installable PWA with app-shell caching and deliberately scoped offline reads/writes. Do not assume service workers provide offline backend execution.

## ADR-008: macOS development, Linux ARM64 runtime

**Decision:** Build portable assets on the M4 Mac, but ensure native Node dependencies target Linux ARM64.

## ADR-009: Provider-owned API schemas

**Decision:** Each API provider owns and publishes its schemas. Store publishes `@bbferm/store-schema`; the BFF owns its browser-facing schemas inside the web app. There is no shared cross-service schema package.

**Rationale:** A shared schema package has no clear owner, couples unrelated boundaries, and lets internal Store shapes leak to the browser. Provider ownership makes the dependency graph match the call graph and makes compatibility the provider's responsibility.

**Consequences:**

- Store's schema is a separate, dependency-light package so consumers do not install Store's runtime dependencies.
- The BFF maps Store DTOs to browser DTOs.
- Shared value types live in `@bbferm/domain`.

## ADR-010: Publicly trusted HTTPS via Let's Encrypt DNS-01 on a dedicated domain

**Context:** The PWA needs a secure context, and session cookies need `Secure`, so browser access must use HTTPS. Client devices must not need a custom root certificate. BBFerm may run in several households, each on a Pi we do not physically control and on a router we cannot configure.

**Decision:**

- Each installation gets its own hostname under a domain registered only for BBFerm (written `<install>.bbferm.example` in these docs; the real domain lives only in per-install config, never in the repo).
- Caddy terminates HTTPS on the LAN interface (port 443), redirects HTTP to HTTPS, and reverse-proxies to Start on `127.0.0.1:3000`. Start, Store and the collector stay loopback-only.
- Caddy obtains and renews a Let's Encrypt certificate with the ACME DNS-01 challenge through the DNS provider's API (DigitalOcean DNS, via the `caddy-dns/digitalocean` module). This needs a custom Caddy build, since distro packages ship without DNS modules.
- The hostname's public A record points to the Pi's private LAN IP. The Pi keeps a dynamic DHCP address and updates its own A record when its LAN IP changes, using the same DNS credential and a low TTL.

**Rationale:**

- A public CA is the only way every phone and laptop trusts the certificate with no installation. Public CAs will not issue for `.local`, so a local CA (mkcert, step-ca, Caddy `tls internal`) would require installing its root on every client device, which is unacceptable for other households.
- DNS-01 proves domain control without exposing the Pi to the internet or forwarding ports.
- DNS provider API tokens cannot be scoped to a single record or domain. A token on a Pi in someone else's house can be extracted from its SD card. A domain and DNS account dedicated to BBFerm limits a leaked token to BBFerm hostnames.
- Self-updating DNS records avoid depending on DHCP reservations in routers we do not administer.
- Caddy handles issuance, renewal, redirects and the privileged port, and keeps Start on loopback, for roughly 30–50 MB of RAM (estimate, to verify on the Pi). Terminating TLS in srvx would save that memory but move ACME, renewal restarts and LAN binding into our own scripts and the web service.

**Consequences:**

- Each Pi needs outbound internet access to renew certificates (Let's Encrypt lifetimes are short and shrinking) and to update its DNS record. A short outage is harmless; a prolonged one eventually expires the certificate. Monitor certificate expiry.
- Routers with DNS rebinding protection may refuse public names that resolve to private IPs. Check this before installing in a household; it needs a router exception and cannot be fixed remotely.
- Hostnames appear in public Certificate Transparency logs. They reveal only that an installation exists.
- The DNS token is a root-only secret under `/etc/bbferm/` on each Pi. Rotate it if a Pi is lost or decommissioned.
- Each installation is independent: its own hostname, certificate, database and accounts. Nothing syncs between installations.
- Administering remote installations (SSH, deploys, logs) uses Tailscale on the Pi, for administrators only. Household users never need Tailscale; the app is served on their LAN.
- Browser login is required: another household's LAN cannot be treated as trusted.

**Alternatives considered:** plain HTTP (no PWA, no `Secure` cookies, credentials in clear text on Wi-Fi); a local CA (root certificate install on every device); Tailscale HTTPS certificates (every household device would need Tailscale); a static IP or DHCP reservation (requires administering each household's router); reusing an existing personal domain (a leaked token would expose all of its DNS).

## Open questions

- Single-user or multi-user authentication.
- SQLite driver and BLE library selection after Pi tests.
- Tilt-to-batch assignment and reassignment history.
- Which offline commands are safe to queue and how conflicts are handled.
- Whether collector needs a durable disk spool or bounded in-memory retry is enough.
- Independent backup destination and restore testing.
- Whether the second Pi is for staging, redundancy, or a future sensor gateway.

## Revisit criteria

Revisit the Start choice only if the Start server runtime proves too heavy or a reliable production PWA integration cannot be achieved. A separate BFF should be introduced only if it gains a genuinely independent lifecycle or runtime requirement.
