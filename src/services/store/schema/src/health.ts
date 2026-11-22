import { z } from 'zod'

/**
 * `GET /health`. `serving` only once Store has finished constructing its
 * dependencies and is listening; `not_serving` during startup and shutdown
 * (returned with HTTP 503).
 */
export const StoreHealthResponse = z.object({
  status: z.enum(['serving', 'not_serving']),
  version: z.string(),
  time: z.iso.datetime({ offset: false }),
})
export type StoreHealthResponse = z.infer<typeof StoreHealthResponse>
