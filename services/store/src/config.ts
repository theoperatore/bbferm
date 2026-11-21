import { z } from 'zod'

const Env = z.object({
  STORE_HOST: z.string().default('127.0.0.1'),
  STORE_PORT: z.coerce.number().int().default(3100),
  STORE_WEB_TOKEN: z.string().min(8),
  STORE_COLLECTOR_TOKEN: z.string().min(8),
  STORE_DB_PATH: z.string().default('./data/bbferm.sqlite'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

export type StoreConfig = z.infer<typeof Env>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): StoreConfig {
  return Env.parse(env)
}
