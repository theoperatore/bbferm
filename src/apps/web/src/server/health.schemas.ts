import { z } from 'zod'
import { UtcTimestamp } from '@bbferm/domain'

/** `GET /api/health` response, published by the web service. */
export const WebHealthResponse = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  version: z.string(),
  time: UtcTimestamp,
})
export type WebHealthResponse = z.infer<typeof WebHealthResponse>
