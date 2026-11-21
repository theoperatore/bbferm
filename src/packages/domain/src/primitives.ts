import { z } from 'zod'

/**
 * Domain value types. Each service builds its own published schemas from
 * these; no service owns them.
 */

/** Stable identifier for all persisted entities. */
export const Id = z.uuid()
export type Id = z.infer<typeof Id>

/** UTC ISO-8601 timestamp, e.g. `2026-11-21T17:00:00.000Z`. */
export const UtcTimestamp = z.iso.datetime({ offset: false })
export type UtcTimestamp = z.infer<typeof UtcTimestamp>

/** Specific gravity as a decimal, e.g. `1.048`. */
export const SpecificGravity = z.number().min(0.9).max(1.2)
export type SpecificGravity = z.infer<typeof SpecificGravity>

/** Measurement origin. */
export const MeasurementSource = z.enum(['tilt', 'manual', 'future_pressure_sensor'])
export type MeasurementSource = z.infer<typeof MeasurementSource>

/** Structured flags for suspicious readings that are retained rather than discarded. */
export const QualityFlag = z.enum(['gravity_out_of_range', 'temperature_out_of_range', 'uncalibrated'])
export type QualityFlag = z.infer<typeof QualityFlag>
