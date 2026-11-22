import { z } from 'zod'
import { Id, MeasurementSource, QualityFlag, SpecificGravity, UtcTimestamp } from '@bbferm/domain'

/**
 * Browser-facing BFF schemas. Owned by the web app; the UI depends on these,
 * never on Store's schema. Client-safe: no server-only imports.
 */

export const Reading = z.object({
  id: Id,
  deviceId: Id.nullable(),
  batchId: Id.nullable(),
  source: MeasurementSource,
  receivedAt: UtcTimestamp,
  gravity: SpecificGravity.nullable(),
  temperatureC: z.number().nullable(),
  qualityFlags: z.array(QualityFlag),
})
export type Reading = z.infer<typeof Reading>

export const LatestReadingsResponse = z.object({
  readings: z.array(Reading),
})
export type LatestReadingsResponse = z.infer<typeof LatestReadingsResponse>
