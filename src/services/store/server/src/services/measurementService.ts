import type { MeasurementIngestRequest, StoreMeasurement } from '@bbferm/store-schema'
import type { MeasurementStore } from '../stores/measurementStore.js'

type Deps = {
  measurementStore: MeasurementStore
}

/**
 * Measurement business logic. Callers have already authenticated and
 * validated the request.
 */
export function createMeasurementService(deps: Deps) {
  const { measurementStore } = deps

  return {
    /** Idempotent: re-ingesting a known measurement ID is a no-op that reports `created: false`. */
    async ingest(request: MeasurementIngestRequest) {
      // TODO(batches): resolve the device's active batch assignment at receive time.
      const record: StoreMeasurement = {
        id: request.id,
        batchId: null,
        deviceId: request.deviceId,
        source: request.source,
        observedAt: null,
        receivedAt: request.receivedAt,
        rawGravity: request.rawGravity,
        gravity: request.gravity,
        rawTemperature: request.rawTemperature,
        temperatureC: request.temperatureC,
        qualityFlags: request.qualityFlags,
        createdAt: new Date().toISOString(),
      }
      const { inserted } = await measurementStore.insertIfAbsent(record)
      return { id: record.id, created: inserted }
    },

    async getLatest() {
      return measurementStore.listLatestPerDevice()
    },
  }
}

export type MeasurementService = ReturnType<typeof createMeasurementService>
