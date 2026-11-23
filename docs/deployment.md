# Raspberry Pi deployment

## Services

| systemd unit               | Process        | Responsibility                                          |
| -------------------------- | -------------- | ------------------------------------------------------- |
| `bbferm-web.service`       | TanStack Start | Serves SPA/PWA and executes BFF server functions/routes |
| `bbferm-collector.service` | Node.js        | Continuously receives Tilt BLE advertisements           |
| `bbferm-store.service`     | Fastify        | Owns SQLite and exposes internal persistence API        |

| Supporting unit      | Responsibility                                                     |
| -------------------- | ------------------------------------------------------------------ |
| `caddy.service`      | Terminates HTTPS on the LAN and reverse-proxies to Start (ADR-010) |
| `avahi-daemon`       | Publishes `bbferm.local` over mDNS                                 |
| `tailscaled.service` | Administrator access (SSH, deploys) to installations we don't host |

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
  tls/
    root.crt       # this installation's name-constrained root (public; install on client devices)
    root.key       # its private key, owned by caddy, mode 0600

/etc/caddy/Caddyfile
/var/lib/caddy/    # Caddy-managed intermediate and site certificates
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

See ADR-010. Each installation is served at `https://bbferm.local` with a certificate from Caddy's local CA, chained to a root we generate per installation and constrain to `bbferm.local`. Each client device installs that root once.

### Hostname

Set the Pi's hostname to `bbferm`. Raspberry Pi OS runs Avahi, which publishes `bbferm.local` over mDNS. The Pi keeps a dynamic DHCP address; no reservation or DNS record is needed.

### Create the installation's root

Do this once per installation, on the Mac:

```ini
# root.cnf
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
CN = BBFerm <install> Root

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
nameConstraints = critical, permitted;DNS:bbferm.local, excluded;IP:0.0.0.0/0.0.0.0, excluded;IP:0:0:0:0:0:0:0:0/0:0:0:0:0:0:0:0
```

```sh
openssl ecparam -name prime256v1 -genkey -noout -out root.key
openssl req -x509 -new -sha256 -key root.key -out root.crt -days 3650 -config root.cnf
openssl x509 -in root.crt -noout -text | grep -A6 "Name Constraints"
```

Generate the key with `openssl ecparam` and sign with `-sha256`. macOS's LibreSSL otherwise defaults to SHA-1 signatures and explicit curve parameters, which Apple devices reject.

Before installing, sign a throwaway certificate for another name (e.g. `www.google.com`) and an IP address with this root, and confirm `openssl verify -CAfile root.crt` reports a subtree violation for both.

Copy `root.crt` and `root.key` to `/etc/bbferm/tls/` on the Pi (`root.key` owned by `caddy`, mode `0600`). Keep a copy of `root.crt` with the household's install notes. Delete the key from the Mac.

### Caddy

The standard Caddy package is sufficient (no extra modules). Run it as `caddy.service` with `AmbientCapabilities=CAP_NET_BIND_SERVICE` so it can bind 80/443 without root.

```caddyfile
{
	skip_install_trust
	pki {
		ca local {
			name "BBFerm"
			root {
				cert /etc/bbferm/tls/root.crt
				key /etc/bbferm/tls/root.key
			}
		}
	}
}

bbferm.local {
	tls internal
	reverse_proxy 127.0.0.1:3000
}
```

`skip_install_trust` stops Caddy from adding the root to the Pi's own trust store. Caddy issues and renews the intermediate and site certificates and redirects HTTP to HTTPS. A web release does not restart Caddy; a Caddy restart does not touch the collector.

`TODO(M2)`: this `pki` block has not yet been run. Confirm with `caddy validate` and check that the served chain ends at our root (`openssl s_client -connect bbferm.local:443 -showcerts`).

### Trust the root on client devices

Once per device, install `root.crt`:

- **macOS:** open it in Keychain Access, add it to the System keychain, and set "When using this certificate" to Always Trust.
- **iOS / iPadOS:** AirDrop or download it, install the profile in Settings → General → VPN & Device Management, then enable it under Settings → General → About → Certificate Trust Settings.
- **Android:** Settings → Security → Encryption & credentials → Install a certificate → CA certificate.
- **Windows:** import it into Trusted Root Certification Authorities (Local Computer).

Then open `https://bbferm.local`, confirm there is no certificate warning, and install the PWA.

### Installing in a household

1. Check that mDNS works on the household network: from a phone on Wi-Fi, `bbferm.local` must resolve. Guest networks and Wi-Fi client isolation block multicast.
2. Create the installation's root and copy it to the Pi.
3. Install Caddy and Tailscale (administrator access only; household devices don't need it).
4. Install the root on each household device and confirm the PWA installs.

### Retiring an installation

Remove its root from that household's devices. If a Pi is lost, its key can only impersonate `bbferm.local` to that household's devices; still remove the root and issue a new one for the replacement Pi.

## Backups

Use SQLite's online backup mechanism or a safe quiesced backup. Keep backups outside release directories, copy encrypted backups to independent storage, monitor backup age/free space, and test restoration.
