# Raspberry Pi deployment

## Services

| systemd unit               | Process        | Responsibility                                          |
| -------------------------- | -------------- | ------------------------------------------------------- |
| `bbferm-web.service`       | TanStack Start | Serves SPA/PWA and executes BFF server functions/routes |
| `bbferm-collector.service` | Node.js        | Continuously receives Tilt BLE advertisements           |
| `bbferm-store.service`     | Fastify        | Owns SQLite and exposes internal persistence API        |

| Supporting unit      | Responsibility                                                       |
| -------------------- | -------------------------------------------------------------------- |
| `caddy.service`      | Terminates HTTPS on the LAN and reverse-proxies to Start (ADR-010)   |
| `bbferm-dns.timer`   | Updates the installation's DNS A record when the Pi's LAN IP changes |
| `tailscaled.service` | Administrator access (SSH, deploys) to installations we don't host   |

Caddy terminates HTTPS and forwards to Start on loopback. Store is loopback-only. The collector only listens on loopback for its health check.

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
  install.env      # BBFERM_HOSTNAME=<install>.bbferm.example
  dns.env          # DO_AUTH_TOKEN, root-only; read by Caddy and bbferm-dns

/etc/caddy/Caddyfile
/var/lib/caddy/    # Caddy-managed certificates and ACME account
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

See ADR-010. Each installation is served at `https://<install>.bbferm.example` with a publicly trusted Let's Encrypt certificate, so client devices need no certificate installation. The real BBFerm domain is per-install configuration and is never committed.

### Caddy

Build Caddy with the DigitalOcean DNS module for Linux ARM64 (distro packages don't include DNS modules):

```sh
GOOS=linux GOARCH=arm64 xcaddy build --with github.com/caddy-dns/digitalocean
```

Install it as `caddy.service` with `EnvironmentFile=/etc/bbferm/install.env` and `/etc/bbferm/dns.env`, and `AmbientCapabilities=CAP_NET_BIND_SERVICE` so it can bind 80/443 without running as root.

```caddyfile
{$BBFERM_HOSTNAME} {
	tls {
		dns digitalocean {env.DO_AUTH_TOKEN}
	}
	reverse_proxy 127.0.0.1:3000
}
```

Caddy obtains the certificate with the DNS-01 challenge, renews it automatically, and redirects HTTP to HTTPS. A web release does not restart Caddy; a Caddy restart does not touch the collector.

### DNS credentials

- Use a DigitalOcean account and domain dedicated to BBFerm. Provider tokens can't be scoped to one record, so this limits what a token extracted from a Pi can change.
- Create a custom-scoped token with only domain read/update permissions. Store it in `/etc/bbferm/dns.env`, owned by root, mode `0600`.
- Use a separate token per installation, named after it, so one can be revoked without affecting the others.

### DNS record

- The A record `<install>.bbferm.example` points to the Pi's private LAN IP, with a low TTL (60s).
- The Pi keeps a dynamic DHCP address. `bbferm-dns.timer` runs every few minutes, compares the Pi's current LAN IP with the record, and updates it through the DigitalOcean API when they differ.
- A DHCP reservation is optional. Use one where you administer the router.

### Installing in a household

1. Before installing, check that the household's router resolves a public name to a private IP. Some routers block this as DNS rebinding protection and need an exception for the BBFerm domain.
2. Create the A record and a per-install DNS token.
3. Install Caddy, `bbferm-dns.timer`, and Tailscale (administrator access only; household devices don't need it).
4. From a household phone on Wi-Fi, open `https://<install>.bbferm.example` and confirm the certificate is valid and the PWA installs.

### Monitoring

Monitor certificate expiry and DNS update failures. Renewal and DNS updates need outbound internet; a short outage is harmless, a prolonged one eventually expires the certificate.

## Backups

Use SQLite's online backup mechanism or a safe quiesced backup. Keep backups outside release directories, copy encrypted backups to independent storage, monitor backup age/free space, and test restoration.
