import dotenv from 'dotenv'
import { z } from 'zod'

const Env = z.object({
  STORE_URL: z.url().default('http://127.0.0.1:3100'),
  STORE_COLLECTOR_TOKEN: z.string().min(8),
  COLLECTOR_SOURCE: z.enum(['replay', 'bluez']).default('replay'),
  COLLECTOR_REPLAY_FILE: z.string().default('./test/fixtures/advertisements.json'),
  COLLECTOR_MIN_INTERVAL_S: z.coerce.number().nonnegative().default(60),
  COLLECTOR_QUEUE_MAX: z.coerce.number().int().positive().default(1000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
})

export type CollectorConfig = z.infer<typeof Env>

/**
 * Loads `.env` from the working directory (if present) into `process.env`,
 * then validates it. Variables already set (e.g. by systemd's EnvironmentFile
 * on the Pi) take precedence over `.env`.
 */
export function loadConfig() {
  dotenv.config({ quiet: true })
  return Env.parse(process.env)
}
