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

## ADR-010: HTTPS from Caddy's local CA with a name-constrained root per installation

**Context:** The PWA needs a secure context, and session cookies need `Secure`, so browser access must use HTTPS. BBFerm may run in several households, each on a Pi we do not physically control and on a router we cannot configure. We accept a one-time root certificate install on each client device in exchange for no domain, no DNS credentials and no internet dependency.

**Decision:**

- Each installation is served at `https://bbferm.local`, resolved by mDNS (Avahi on the Pi). The Pi keeps a dynamic DHCP address.
- Caddy terminates HTTPS on the LAN interface (port 443), redirects HTTP to HTTPS, and reverse-proxies to Start on `127.0.0.1:3000`. Start, Store and the collector stay loopback-only.
- Caddy issues and renews the site certificate from its built-in local CA (`tls internal`).
- We generate each installation's root certificate ourselves, with a critical X.509 Name Constraints extension that permits only `DNS:bbferm.local` and excludes all IPv4 and IPv6 addresses. Caddy is configured to use that root instead of generating its own. Every installation gets its own root.
- Each client device installs its household's root certificate once.

**Rationale:**

- A trusted root normally vouches for any name. Anyone who extracted an unconstrained root key from a Pi's SD card could impersonate any website to every device that trusts it. With name constraints, client verifiers reject certificates for any other name or for IP addresses, so a leaked key can only impersonate that installation's `bbferm.local`.
- Verified on macOS 27 (`security verify-cert`, the Security framework shared with iOS) and LibreSSL 3.3: a constrained root's `bbferm.local` certificate is trusted; its `www.google.com` and IP-address certificates are rejected, while an unconstrained root's are trusted. Chrome and Firefox also enforce name constraints; confirm on each client platform at install time.
- Because the constraint lives in the root certificate the devices trust, the root key can stay on the Pi for Caddy to renew intermediates. No offline key ceremony is needed after creation.
- No domain, DNS provider token, DNS record updater, internet access, or router DNS-rebinding exception is needed. mDNS works with dynamic addresses.
- Caddy handles issuance, renewal, redirects and the privileged port, and keeps Start on loopback, for roughly 30–50 MB of RAM (estimate, to verify on the Pi). The standard Caddy build is sufficient.

**Consequences:**

- Every client device in a household installs and trusts that household's root once (iOS also needs full trust enabled in Certificate Trust Settings). Root certificates last 10 years; site certificates renew automatically.
- Losing a Pi exposes only its household's `bbferm.local`. Retire the root by removing it from that household's devices, and issue a new root for the replacement Pi.
- mDNS needs multicast between clients and the Pi. Guest networks and Wi-Fi client isolation can block it. Older Android versions resolve `.local` inconsistently.
- Every installation shares the origin `https://bbferm.local`. A device that visits more than one installation (an administrator's) shares the PWA install, service worker and cookies across them and must trust each root. If that becomes a problem, give that installation a distinct hostname (`bbferm-<install>.local`) and constrain its root to it.
- The root private key is a secret on the Pi, readable only by Caddy. Keep a backup of each household's root certificate (not necessarily its key).
- Each installation is independent: its own root, database and accounts. Nothing syncs between installations.
- Administering remote installations (SSH, deploys, logs) uses Tailscale on the Pi, for administrators only. Household users never need Tailscale; the app is served on their LAN.
- Browser login is required: another household's LAN cannot be treated as trusted.

**Alternatives considered:**

- **Let's Encrypt via DNS-01 on a dedicated domain:** no device setup, but needs a domain, a DNS token on every Pi (unscopable to a single record), a DNS record updater, internet for renewals, and a DNS-rebinding exception on routers we don't control.
- **Caddy's default unconstrained local root:** a leaked key could impersonate any website to the household's devices.
- **Self-signed site certificate:** browsers refuse to register a service worker on certificate errors, and trusting it per device has the same cost without automatic renewal.
- **Plain HTTP:** no PWA, no `Secure` cookies, and credentials in clear text on Wi-Fi.
- **Tailscale HTTPS certificates:** every household device would need Tailscale.

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
