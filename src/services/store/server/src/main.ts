import { createHttpServer } from '@bbferm/http-server';
import { storeRoutes } from '@bbferm/store-schema';
import { loadConfig } from './config.js';

// 1. Configuration
const config = loadConfig();

// 2. Clients (upstream services): none.

// 3. Stores
// TODO(M3): select the SQLite driver and validate it on the Pi Zero 2 W (Linux ARM64 native build, not macOS node_modules).
// TODO(M3): open the connection with foreign keys and WAL enabled; add migrations and a schema_migrations table.
// TODO(M3): DAOs for measurements, devices, device assignments, batches, recipes, brew events, idempotency keys (docs/data-model.md).

// 4. Services
// TODO(M3): services for idempotent measurement ingestion, latest/bounded-history queries, and batch/recipe/device operations.
// TODO(M3): online SQLite backup and a tested restore procedure.

// 5. Server (health route included) with handlers registered as routes; 6. start, then report serving.
// TODO(M3): separate bearer credentials for web and collector, checked in handlers (auth/).
// TODO(M3): /internal/v1/status (database + schema version) and the endpoints in docs/api-contracts.md, each added with .route(...).
// TODO(M2): run as bbferm-store.service; verify restart-on-failure, journald logs, and clean SIGTERM shutdown on the Pi.
await createHttpServer({ logLevel: config.LOG_LEVEL, version: '0.0.0', healthPath: storeRoutes.health }).start({
  host: config.STORE_HOST,
  port: config.STORE_PORT,
});
