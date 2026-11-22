import '@tanstack/react-start/server-only'
import { createHttpClient } from '@bbferm/http-client'
import dotenv from 'dotenv'

/**
 * Store client. Created lazily on first use; the Store URL comes from the
 * server environment and must never reach the browser.
 */
let client: ReturnType<typeof createStoreClient> | undefined

export function storeClient() {
  client ??= createStoreClient()
  return client
}

function createStoreClient() {
  // Load `.env` (if present) for local runs; variables already set by the environment win.
  dotenv.config({ quiet: true })
  // TODO(M3): pass the web service's bearer credential (STORE_WEB_TOKEN) once Store has authenticated endpoints.
  return createHttpClient({ baseUrl: process.env.STORE_URL ?? 'http://127.0.0.1:3100' })
}
