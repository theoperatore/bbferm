import dotenv from 'dotenv';
import { z } from 'zod';

const Env = z.object({
  STORE_HOST: z.string().default('127.0.0.1'),
  STORE_PORT: z.coerce.number().int().default(3100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // TODO(M3): STORE_DB_PATH, plus STORE_WEB_TOKEN and STORE_COLLECTOR_TOKEN once endpoints need caller auth.
});

export type StoreConfig = z.infer<typeof Env>;

/**
 * Loads `.env` from the working directory (if present) into `process.env`,
 * then validates it. Variables already set (e.g. by systemd's EnvironmentFile
 * on the Pi) take precedence over `.env`.
 */
export function loadConfig() {
  dotenv.config({ quiet: true });
  return Env.parse(process.env);
}
