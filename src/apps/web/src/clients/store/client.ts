import '@tanstack/react-start/server-only'
import dotenv from 'dotenv'
import type { z } from 'zod'

/**
 * Store client. Created lazily on first use; the Store URL and credential
 * come from the server environment and must never reach the browser.
 */
let client: ReturnType<typeof createStoreClient> | undefined

export function storeClient() {
  client ??= createStoreClient()
  return client
}

export class StoreUnavailableError extends Error {
  constructor() {
    super('Store is unavailable')
  }
}

function createStoreClient() {
  // Load `.env` (if present) for local runs; variables already set by the environment win.
  dotenv.config({ quiet: true })
  const baseUrl = process.env.STORE_URL ?? 'http://127.0.0.1:3100'
  const token = process.env.STORE_WEB_TOKEN
  if (!token) throw new Error('STORE_WEB_TOKEN is not set')

  return {
    /** GET a Store route and parse the response with Store's published schema. */
    async get<S extends z.ZodType>(path: string, schema: S) {
      let res: Response
      try {
        res = await fetch(`${baseUrl}${path}`, {
          headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        })
      } catch {
        throw new StoreUnavailableError()
      }
      if (!res.ok) throw new StoreUnavailableError()
      return schema.parse(await res.json())
    },
  }
}
