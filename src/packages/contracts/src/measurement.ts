import { z } from 'zod'
import { Id, SpecificGravity, UtcTimestamp } from './common.js'

export const MeasurementSource = z.enum(['tilt', 'manual', 'future_pressure_sensor'])
export type MeasurementSource = z.infer<typeof MeasurementSource>

export const QualityFlag = z.enum([
  'gravity_out_of_range',
  'temperature_out_of_range',
  'uncalibrated',
])
export type QualityFlag = z.infer<typeof QualityFlag>

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
 * Measurement submitted by the collector. `id` doubles as the idempotency key,
 * so retries cannot create duplicates.
 */
export const MeasurementIngest = z.object({
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
export type MeasurementIngest = z.infer<typeof MeasurementIngest>

export const Measurement = z.object({
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
export type Measurement = z.infer<typeof Measurement>

export const LatestMeasurementsResponse = z.object({
  measurements: z.array(Measurement),
})
export type LatestMeasurementsResponse = z.infer<typeof LatestMeasurementsResponse>

export const MeasurementIngestResponse = z.object({
  id: Id,
  /** `false` when the measurement ID was already recorded (idempotent replay). */
  created: z.boolean(),
})
export type MeasurementIngestResponse = z.infer<typeof MeasurementIngestResponse>
