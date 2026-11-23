import { z } from 'zod';

// TODO(M3): add codes (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, CONFLICT) with the endpoints that need them.
export const StoreErrorCode = z.enum(['NOT_FOUND', 'INTERNAL_ERROR']);
export type StoreErrorCode = z.infer<typeof StoreErrorCode>;

/** Store's error envelope. Never carries stack traces, SQL, paths, or secrets. */
export const StoreErrorEnvelope = z.object({
  error: z.object({
    code: StoreErrorCode,
    message: z.string(),
    requestId: z.string().optional(),
  }),
});
export type StoreErrorEnvelope = z.infer<typeof StoreErrorEnvelope>;
