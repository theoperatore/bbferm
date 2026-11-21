import '@tanstack/react-start/server-only'
import type { z } from 'zod'

/**
 * Server-only Store client. The Store URL and credential are read from the
 * server environment and must never be exposed to the browser.
 */
function storeEnv() {
  const url = process.env.STORE_URL ?? 'http://127.0.0.1:3100'
  const token = process.env.STORE_WEB_TOKEN
  if (!token) throw new Error('STORE_WEB_TOKEN is not set')
  return { url, token }
}

export class StoreUnavailableError extends Error {
  constructor() {
    super('Store is unavailable')
  }
}

/** GET a Store route and parse the response with Store's published schema. */
export async function storeGet<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
  const { url, token } = storeEnv()
  let res: Response
  try {
    res = await fetch(`${url}${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    throw new StoreUnavailableError()
  }
  if (!res.ok) throw new StoreUnavailableError()
  return schema.parse(await res.json())
}
