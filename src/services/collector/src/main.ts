import { createHttpServer } from '@bbferm/http-server';
import { loadConfig } from './config.js';

// 1. Configuration
const config = loadConfig();

// 2. Clients
// TODO(M4): Store client (@bbferm/http-client) and a measurement-ingest RPC, once Store's ingestion endpoint exists (M3).

// 3. Stores
// TODO(M4): decide whether bounded in-memory retry is enough or a disk spool is needed (docs/decisions.md open question).

// 4. Services
// TODO(M4): choose a BLE library and validate BlueZ scanning on the Pi Zero 2 W before writing any decoding.
// TODO(M4): capture real Tilt advertisements on the Pi as test fixtures; derive the Tilt format from those captures.
// TODO(M4): decode and validate readings, preserving the raw payload and receive time; submit with an idempotency key and bounded retry.
// TODO(M4): mark health not_serving (HttpServer.health.setNotServing()) when the Bluetooth adapter or scan fails.

// 5. Server (health route at /health) with handlers registered as routes; 6. start, then report serving.
// TODO(M5): if the web app shows collector status, publish the health response in a collector schema package (ADR-009).
// TODO(M4): run as bbferm-collector.service; verify a web release (bbferm-web.service restart) never interrupts it.
await createHttpServer({ logLevel: config.LOG_LEVEL, version: '0.0.0' }).start({
  host: config.COLLECTOR_HOST,
  port: config.COLLECTOR_PORT,
});
