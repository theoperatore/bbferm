import { z } from 'zod';

/** Browser-facing BFF schema. Client-safe: no server-only imports. */
export const StoreHealth = z.object({
  store: z.enum(['serving', 'unavailable']),
  checkedAt: z.iso.datetime({ offset: false }),
});
export type StoreHealth = z.infer<typeof StoreHealth>;
