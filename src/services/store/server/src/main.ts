import { createCallerAuth } from './auth/callerAuth.js'
import { loadConfig } from './config.js'
import { createGetHealthHandler } from './handlers/getHealth.js'
import { createGetLatestMeasurementsHandler } from './handlers/getLatestMeasurements.js'
import { createGetStatusHandler } from './handlers/getStatus.js'
import { createIngestMeasurementHandler } from './handlers/ingestMeasurement.js'
import { createHttpServer } from './http/server.js'
import { createHealthService } from './services/healthService.js'
import { createMeasurementService } from './services/measurementService.js'
import { createStatusService } from './services/statusService.js'
import { createInMemoryDatabase } from './stores/inMemoryDatabase.js'
import { createInMemoryMeasurementStore } from './stores/measurementStore.js'

// 1. Configuration
const config = loadConfig()

// 2. Clients (upstream services): none yet.

// 3. Stores
const database = createInMemoryDatabase()
const measurementStore = createInMemoryMeasurementStore({ database })

// 4. Services
const healthService = createHealthService({ version: '0.0.0' })
const statusService = createStatusService({ database })
const measurementService = createMeasurementService({ measurementStore })

// 5. Handlers, registered to routes
const auth = createCallerAuth({ webToken: config.STORE_WEB_TOKEN, collectorToken: config.STORE_COLLECTOR_TOKEN })
const server = createHttpServer({ logLevel: config.LOG_LEVEL })
server.route(createGetHealthHandler({ healthService }))
server.route(createGetStatusHandler({ auth, statusService }))
server.route(createIngestMeasurementHandler({ auth, measurementService }))
server.route(createGetLatestMeasurementsHandler({ auth, measurementService }))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    server.log.info({ signal }, 'shutting down')
    healthService.setNotServing()
    await server.close()
    process.exit(0)
  })
}

// 6. Start, then report serving
await server.listen({ host: config.STORE_HOST, port: config.STORE_PORT })
healthService.setServing()
