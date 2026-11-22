import { randomUUID } from 'node:crypto'
import { fahrenheitToCelsius, type QualityFlag } from '@bbferm/domain'
import type { MeasurementIngestRequest } from '@bbferm/store-schema'
import type { Logger } from '../log.js'
import type { TiltReading } from '../tilt/decode.js'
import { tiltDeviceId } from '../tilt/deviceId.js'
import type { SubmissionService } from './submissionService.js'

type Deps = {
  submissionService: SubmissionService
  minIntervalS: number
  log: Logger
}

/**
 * Turns decoded Tilt readings into measurements. Tilts broadcast every few
 * seconds; at most one reading per Tilt per `minIntervalS` is submitted.
 */
export function createReadingService(deps: Deps) {
  const { submissionService, minIntervalS, log } = deps
  const lastSubmittedAt = new Map<string, number>()

  return {
    record(reading: TiltReading, receivedAt: Date) {
      const now = receivedAt.getTime()
      if (now - (lastSubmittedAt.get(reading.color) ?? 0) < minIntervalS * 1000) return
      lastSubmittedAt.set(reading.color, now)

      const qualityFlags: QualityFlag[] = ['uncalibrated']
      if (reading.gravity < 0.98 || reading.gravity > 1.15) qualityFlags.push('gravity_out_of_range')
      if (reading.temperatureF < 25 || reading.temperatureF > 120) qualityFlags.push('temperature_out_of_range')

      // The ID is generated once here and reused across retries: it is Store's idempotency key.
      const measurement: MeasurementIngestRequest = {
        id: randomUUID(),
        deviceId: tiltDeviceId(reading.color),
        source: 'tilt',
        receivedAt: receivedAt.toISOString(),
        rawGravity: reading.gravity,
        gravity: reading.gravity,
        rawTemperature: reading.temperatureF,
        temperatureC: fahrenheitToCelsius(reading.temperatureF),
        rawPayload: reading.raw,
        qualityFlags,
      }
      log.info('tilt reading', { color: reading.color, gravity: reading.gravity, temperatureF: reading.temperatureF })
      submissionService.enqueue(measurement)
    },
  }
}

export type ReadingService = ReturnType<typeof createReadingService>
