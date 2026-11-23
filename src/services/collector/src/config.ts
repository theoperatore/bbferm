import dotenv from 'dotenv';
import { z } from 'zod';

const Env = z.object({
  COLLECTOR_HOST: z.string().default('127.0.0.1'),
  COLLECTOR_PORT: z.coerce.number().int().default(3200),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // TODO(M4): STORE_URL and STORE_COLLECTOR_TOKEN once measurements are submitted to Store.
});

export type CollectorConfig = z.infer<typeof Env>;

/**
 * Loads `.env` from the working directory (if present) into `process.env`,
 * then validates it. Variables already set (e.g. by systemd's EnvironmentFile
 * on the Pi) take precedence over `.env`.
 */
export function loadConfig() {
  dotenv.config({ quiet: true });
  return Env.parse(process.env);
}
