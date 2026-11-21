import { createServerFn } from '@tanstack/react-start'
import { LatestMeasurementsResponse, type StoreMeasurement, storeRoutes } from '@bbferm/store-contract'
import { LatestReadingsResponse, type Reading } from './measurements.schemas'
import { storeGet } from './store-client.server'

/** Store DTO → browser DTO. Raw sensor fields and internal metadata stay server-side. */
function toReading(m: StoreMeasurement): Reading {
  return {
    id: m.id,
    deviceId: m.deviceId,
    batchId: m.batchId,
    source: m.source,
    receivedAt: m.receivedAt,
    gravity: m.gravity,
    temperatureC: m.temperatureC,
    qualityFlags: m.qualityFlags,
  }
}

/** BFF: latest reading per device. */
export const getLatestReadings = createServerFn({ method: 'GET' }).handler(async () => {
  // TODO(auth): authenticate the browser session before calling Store.
  const store = await storeGet(storeRoutes.latestMeasurements, LatestMeasurementsResponse)
  return LatestReadingsResponse.parse({ readings: store.measurements.map(toReading) })
})
