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

## ADR-009: Provider-owned API contracts
**Decision:** Each API provider owns and publishes its schemas. Store publishes `@bbferm/store-contract`; the BFF owns its browser-facing schemas inside the web app. There is no shared cross-service contracts package.

**Rationale:** A shared contracts package has no clear owner, couples unrelated boundaries, and lets internal Store shapes leak to the browser. Provider ownership makes the dependency graph match the call graph and makes compatibility the provider's responsibility.

**Consequences:**
- Store's contract is a separate, dependency-light package so consumers do not install Store's runtime dependencies.
- The BFF maps Store DTOs to browser DTOs.
- Shared value types live in `@bbferm/domain`.

## Open questions
- Local CA and certificate trust workflow for `https://bbferm.local`.
- Single-user or multi-user authentication.
- SQLite driver and BLE library selection after Pi tests.
- Tilt-to-batch assignment and reassignment history.
- Which offline commands are safe to queue and how conflicts are handled.
- Whether collector needs a durable disk spool or bounded in-memory retry is enough.
- Independent backup destination and restore testing.
- Whether the second Pi is for staging, redundancy, or a future sensor gateway.

## Revisit criteria
Revisit the Start choice only if the Start server runtime proves too heavy or a reliable production PWA integration cannot be achieved. A separate BFF should be introduced only if it gains a genuinely independent lifecycle or runtime requirement.
