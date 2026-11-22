import type { StoreMeasurement } from '@bbferm/store-schema'
import { createServerFn } from '@tanstack/react-start'
import { getLatestMeasurements } from '../../../clients/store/getLatestMeasurements'
import { LatestReadingsResponse } from './latestReadings.schemas'

/** Store DTO → browser DTO. Raw sensor fields and internal metadata stay server-side. */
function toReading(m: StoreMeasurement) {
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
  const store = await getLatestMeasurements({})
  return LatestReadingsResponse.parse({ readings: store.measurements.map(toReading) })
})
