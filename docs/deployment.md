# Raspberry Pi deployment

## Services

| systemd unit | Process | Responsibility |
|---|---|---|
| `bbferm-web.service` | TanStack Start | Serves SPA/PWA and executes BFF server functions/routes |
| `bbferm-collector.service` | Node.js | Continuously receives Tilt BLE advertisements |
| `bbferm-store.service` | Fastify | Owns SQLite and exposes internal persistence API |

A reverse proxy such as Caddy terminates HTTPS and forwards to Start on loopback. Store is loopback-only. Collector requires no inbound listener.

## Filesystem

```text
/opt/bbferm/
  releases/<release-id>/
    web/
    collector/
    store/
  current -> releases/<active-release>

/var/lib/bbferm/
  bbferm.sqlite
  backups/
  collector-spool/

/etc/bbferm/
  web.env
  store.env
  collector.env
  tls/
```

Keep persistent data and secrets outside versioned release directories.

## Build compatibility

Build portable browser assets on the M4 Mac. macOS ARM64 native Node modules are not Linux ARM64 binaries. Install/build native dependencies in a compatible Linux ARM64 environment or on the Pi during a controlled setup. Never copy the Mac `node_modules` wholesale.

## Release procedure

1. Test and build.
2. Create a versioned release.
3. Transfer artifacts to the Pi.
4. Prepare Linux ARM64 production dependencies.
5. Verify checksums and required files.
6. For Store schema changes, create and verify a database backup before migration.
7. Atomically switch the active release.
8. Restart only the service(s) included in the release.
9. Check health and logs; roll back if necessary.

### Web release
A web release updates the TanStack Start app and restarts **only** `bbferm-web.service`. It does not restart collector or Store.

### Collector release
Restart only `bbferm-collector.service`; verify BLE scanning resumes and measurements reach Store.

### Store release
Back up SQLite, apply migrations deliberately, restart `bbferm-store.service`, and verify schema/API health. Keep migrations compatible with currently deployed clients where practical.

## systemd and operations
Run services as unprivileged users, use environment files under `/etc/bbferm`, log to journald, configure restart-on-failure, and handle SIGTERM gracefully. Store clients should retry readiness rather than relying solely on systemd ordering.

## HTTPS
Use a DHCP reservation and hostname `bbferm.local`. PWA service workers require a secure context. Use a local CA/certificate trusted by each client device and document certificate installation and renewal.

## Backups
Use SQLite's online backup mechanism or a safe quiesced backup. Keep backups outside release directories, copy encrypted backups to independent storage, monitor backup age/free space, and test restoration.
