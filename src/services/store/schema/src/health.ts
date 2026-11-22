import { z } from 'zod'
import { UtcTimestamp } from '@bbferm/domain'

/**
 * `GET /health`. `serving` only once Store has finished constructing its
 * dependencies and is listening; `not_serving` during startup and shutdown
 * (returned with HTTP 503).
 */
export const StoreHealthResponse = z.object({
  status: z.enum(['serving', 'not_serving']),
  version: z.string(),
  time: UtcTimestamp,
})
export type StoreHealthResponse = z.infer<typeof StoreHealthResponse>

export const StoreStatusResponse = z.object({
  database: z.enum(['ok', 'unavailable', 'mock']),
  schemaVersion: z.number().int().nonnegative(),
})
export type StoreStatusResponse = z.infer<typeof StoreStatusResponse>
