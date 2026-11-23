import { z } from 'zod';

/** `getHealth`: no fields. */
export const GetHealthRequest = z.object({});
export type GetHealthRequest = z.input<typeof GetHealthRequest>;

/**
 * `serving` only once Store has finished constructing its dependencies and is
 * listening; `not_serving` during startup and shutdown (returned with HTTP 503).
 */
export const GetHealthResponse = z.object({
  status: z.enum(['serving', 'not_serving']),
  version: z.string(),
  time: z.iso.datetime({ offset: false }),
});
export type GetHealthResponse = z.output<typeof GetHealthResponse>;
