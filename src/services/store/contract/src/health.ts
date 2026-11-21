import { z } from 'zod'
import { UtcTimestamp } from '@bbferm/domain'

export const StoreHealthResponse = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  version: z.string(),
  time: UtcTimestamp,
})
export type StoreHealthResponse = z.infer<typeof StoreHealthResponse>

export const StoreStatusResponse = z.object({
  database: z.enum(['ok', 'unavailable', 'mock']),
  schemaVersion: z.number().int().nonnegative(),
})
export type StoreStatusResponse = z.infer<typeof StoreStatusResponse>
