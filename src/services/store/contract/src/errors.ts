import { z } from 'zod'

export const StoreErrorCode = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
])
export type StoreErrorCode = z.infer<typeof StoreErrorCode>

/** Store's error envelope. Never carries stack traces, SQL, paths, or secrets. */
export const StoreErrorEnvelope = z.object({
  error: z.object({
    code: StoreErrorCode,
    message: z.string(),
    requestId: z.string().optional(),
  }),
})
export type StoreErrorEnvelope = z.infer<typeof StoreErrorEnvelope>
