import { z } from 'zod'
import { UtcTimestamp } from './common.js'

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.enum(['web', 'store', 'collector']),
  version: z.string(),
  time: UtcTimestamp,
})
export type HealthResponse = z.infer<typeof HealthResponse>

export const StoreStatusResponse = z.object({
  database: z.enum(['ok', 'unavailable', 'mock']),
  schemaVersion: z.number().int().nonnegative(),
})
export type StoreStatusResponse = z.infer<typeof StoreStatusResponse>
