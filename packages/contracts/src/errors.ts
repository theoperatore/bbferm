import { z } from 'zod'

export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL_ERROR',
])
export type ErrorCode = z.infer<typeof ErrorCode>

/** Stable error envelope. Never carries stack traces, SQL, paths, or secrets. */
export const ErrorEnvelope = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string().optional(),
  }),
})
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>
