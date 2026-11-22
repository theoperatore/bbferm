import type { AdvertisementSource } from './ble/advertisementSource.js'
import { createBluezSource } from './ble/bluezSource.js'
import { createReplaySource } from './ble/replaySource.js'
import { createStoreClient } from './clients/store/client.js'
import { createIngestMeasurement } from './clients/store/ingestMeasurement.js'
import { loadConfig } from './config.js'
import { createAdvertisementHandler } from './handlers/handleAdvertisement.js'
import { createLogger } from './log.js'
import { createHealthService } from './services/healthService.js'
import { createReadingService } from './services/readingService.js'
import { createSubmissionService } from './services/submissionService.js'
import { createInMemorySubmissionQueueStore } from './stores/submissionQueueStore.js'

// 1. Configuration
const config = loadConfig()
const log = createLogger(config.LOG_LEVEL)

// 2. Clients
const storeClient = createStoreClient({ baseUrl: config.STORE_URL, token: config.STORE_COLLECTOR_TOKEN })
const ingestMeasurement = createIngestMeasurement({ storeClient })

// 3. Stores
const queue = createInMemorySubmissionQueueStore({ maxSize: config.COLLECTOR_QUEUE_MAX })

// 4. Services
const healthService = createHealthService({ log })
const submissionService = createSubmissionService({ ingestMeasurement, queue, log })
const readingService = createReadingService({ submissionService, minIntervalS: config.COLLECTOR_MIN_INTERVAL_S, log })

// 5. Handlers, registered to the advertisement source
const handleAdvertisement = createAdvertisementHandler({ readingService })
const source: AdvertisementSource =
  config.COLLECTOR_SOURCE === 'replay'
    ? createReplaySource({ file: config.COLLECTOR_REPLAY_FILE })
    : createBluezSource()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    log.info('shutting down', { signal, queued: submissionService.queued() })
    healthService.setNotServing()
    submissionService.stop()
    await source.stop()
    process.exit(0)
  })
}

// 6. Start, then report serving
await source.start(handleAdvertisement)
log.info('collector started', { source: config.COLLECTOR_SOURCE })
healthService.setServing()
