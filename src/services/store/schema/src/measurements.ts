import { Id, MeasurementSource, QualityFlag, SpecificGravity, UtcTimestamp } from '@bbferm/domain'
import { z } from 'zod'

/** Raw Tilt iBeacon fields, preserved for later reinterpretation. */
export const TiltRawPayload = z.object({
  version: z.literal(1),
  uuid: z.string(),
  major: z.number().int(),
  minor: z.number().int(),
  txPower: z.number().int(),
  rssi: z.number().int().optional(),
})
export type TiltRawPayload = z.infer<typeof TiltRawPayload>

/**
 * `POST /measurements` request body. `id` doubles as the idempotency key,
 * so retries cannot create duplicates.
 */
export const MeasurementIngestRequest = z.object({
  id: Id,
  deviceId: Id,
  source: z.literal('tilt'),
  receivedAt: UtcTimestamp,
  rawGravity: z.number(),
  gravity: z.number(),
  rawTemperature: z.number(),
  temperatureC: z.number(),
  rawPayload: TiltRawPayload,
  qualityFlags: z.array(QualityFlag).default([]),
})
export type MeasurementIngestRequest = z.infer<typeof MeasurementIngestRequest>

export const MeasurementIngestResponse = z.object({
  id: Id,
  /** `false` when the measurement ID was already recorded (idempotent replay). */
  created: z.boolean(),
})
export type MeasurementIngestResponse = z.infer<typeof MeasurementIngestResponse>

export const StoreMeasurement = z.object({
  id: Id,
  batchId: Id.nullable(),
  deviceId: Id.nullable(),
  source: MeasurementSource,
  observedAt: UtcTimestamp.nullable(),
  receivedAt: UtcTimestamp,
  rawGravity: z.number().nullable(),
  gravity: SpecificGravity.nullable(),
  rawTemperature: z.number().nullable(),
  temperatureC: z.number().nullable(),
  qualityFlags: z.array(QualityFlag),
  createdAt: UtcTimestamp,
})
export type StoreMeasurement = z.infer<typeof StoreMeasurement>

/** `GET /measurements/latest` response: latest reading per device. */
export const LatestMeasurementsResponse = z.object({
  measurements: z.array(StoreMeasurement),
})
export type LatestMeasurementsResponse = z.infer<typeof LatestMeasurementsResponse>
