# Security and operations

## Network boundaries

- Expose only HTTPS for browser access on the home LAN.
- Bind BFF and persistence API to loopback or protected Unix sockets.
- Do not expose the SQLite file over SMB/NFS.
- Do not expose the internal persistence API to the LAN.
- Do not configure public port forwarding.
- Use a DHCP reservation and firewall rules to restrict access where you administer the router (e.g. the home UniFi network). Installations in other households rely on the Pi updating its own DNS record instead (ADR-010).
- Administer installations in other households over Tailscale. Only administrators join the tailnet; household devices reach the app on their LAN.

Home Wi-Fi/Ethernet is not an authentication system. Any device or person on the LAN should not automatically gain unrestricted write access.

## Authentication

The first release needs a simple local authentication strategy. Decide whether there is one trusted household account or multiple users before implementing authorization. Do not ship an unauthenticated write API.

For a single-user initial deployment, a strong local account/password with server-side sessions is a reasonable starting point. Store only password hashes using a modern password hashing algorithm. Use random, high-entropy session identifiers and rotate them on login.

Session cookies:

- `HttpOnly`
- `Secure`
- `SameSite=Lax` or stricter where compatible
- narrow path/domain scope
- bounded lifetime and server-side revocation

Protect state-changing requests against CSRF. Validate `Origin`/`Host` and use a CSRF token strategy where needed. Apply login rate limiting and avoid revealing whether an account exists.

## TLS and DNS credentials

- Certificates come from Let's Encrypt via DNS-01 (ADR-010). No client device installs a custom root certificate.
- The DNS provider token is a root-only secret in `/etc/bbferm/dns.env`. It belongs to a DNS account and domain dedicated to BBFerm, because provider tokens can't be limited to one record.
- Use one token per installation and revoke it when a Pi is lost, replaced, or decommissioned. Assume anyone with physical access to a Pi's SD card can read it.
- Monitor certificate expiry and DNS update failures.

## Service-to-service security

- Persistence API listens only on loopback or a Unix socket.
- Use separate credentials for BFF and collector if using HTTP bearer authentication.
- Store secrets in root-owned files under `/etc/bbferm`, not in source control.
- Give collector credentials permission only to submit measurements and report collector status.
- Give BFF credentials only the operations required by the application.
- Rotate credentials without requiring a full OS reinstall.
- Never expose internal credentials to the PWA or `VITE_*` variables.

A Unix domain socket with restrictive ownership/mode can reduce network exposure further, but HTTP on loopback with separate random credentials is acceptable for the first implementation.

## Input and output safety

- Validate all request bodies, path parameters, and query parameters at runtime.
- Enforce maximum request sizes and query limits.
- Use parameterized SQL exclusively.
- Never accept SQL, table names, or arbitrary sort expressions from clients.
- Normalize and validate timestamps, gravity, temperature, UUIDs, and enum values.
- Avoid returning stack traces or internal filesystem details.
- Add security headers at the TanStack Start BFF/reverse proxy, including a considered Content Security Policy.
- Use a restrictive CORS policy; ideally no cross-origin browser API access is needed.
- Treat BLE manufacturer data as untrusted input.

## PWA caching

- Precache only static application assets.
- Do not cache login, session, or authenticated API responses by default.
- If caching recent readings, define the exact routes, maximum age, and invalidation behavior.
- Clearly label cached readings with their timestamp and stale/offline state.
- Clear user-specific cached data on logout if multiple users are supported.
- Do not store secrets or session tokens in localStorage or IndexedDB.

## Linux host hardening

- Keep Raspberry Pi OS and packages updated.
- Disable password SSH login after verifying key-based access.
- Disable root SSH login.
- Use a non-root administrator account with sudo.
- Keep service accounts unprivileged.
- Restrict file permissions on database, backups, and secrets.
- Enable unattended security updates only after deciding how to handle service restarts and reboot windows.
- Use systemd sandboxing where compatible with BLE and filesystem requirements.
- Keep a documented recovery path if SSH or networking is misconfigured.

## Logging and monitoring

Use structured logs to journald. Include timestamps, service name, request/correlation ID, device ID, and error code where relevant. Do not log passwords, session cookies, bearer tokens, or full secrets.

Monitor:

- last Tilt advertisement received per device
- last successful measurement persisted
- collector scan state/restarts
- persistence API health and SQLite write errors
- free disk space and database size
- backup success and age of last backup
- service restart counts
- Pi temperature, memory, and CPU load

Provide a dashboard indicator distinguishing:

- latest measurement time
- collector last-seen time
- database/API availability
- stale data vs no assigned Tilt

## Data integrity

- Enable SQLite foreign keys and WAL mode.
- Use transactions for related writes.
- Use idempotency keys for retried writes.
- Back up before schema migrations.
- Test restore periodically.
- Keep raw Tilt readings and calibration history.
- Define behavior for clock changes and incorrect system time; NTP should be enabled.
