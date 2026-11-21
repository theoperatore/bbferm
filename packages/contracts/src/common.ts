import { z } from 'zod'

/** Stable identifier for all persisted entities. */
export const Id = z.uuid()
export type Id = z.infer<typeof Id>

/** UTC ISO-8601 timestamp, e.g. `2026-11-21T17:00:00.000Z`. */
export const UtcTimestamp = z.iso.datetime({ offset: false })
export type UtcTimestamp = z.infer<typeof UtcTimestamp>

/** Specific gravity as a decimal, e.g. `1.048`. */
export const SpecificGravity = z.number().min(0.9).max(1.2)
export type SpecificGravity = z.infer<typeof SpecificGravity>

/** Bounded time-series query. Unbounded reads are rejected. */
export const BoundedRangeQuery = z
  .object({
    from: UtcTimestamp,
    to: UtcTimestamp,
    limit: z.coerce.number().int().min(1).max(5000).default(500),
    cursor: z.string().optional(),
  })
  .refine((q) => q.from <= q.to, { message: '`from` must be before `to`' })
export type BoundedRangeQuery = z.infer<typeof BoundedRangeQuery>

/** Internal Store API prefix. */
export const STORE_API_PREFIX = '/internal/v1'
