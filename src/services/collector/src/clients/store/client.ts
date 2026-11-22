import type { z } from 'zod'

/** Store reachable but rejected the request as invalid (400). Retrying won't help. */
export class StoreRejectedError extends Error {
  constructor() {
    super('Store rejected the request')
  }
}

/** Store unreachable, timed out, or failed (including 401/403 until credentials are fixed). Retryable. */
export class StoreUnavailableError extends Error {
  constructor() {
    super('Store is unavailable')
  }
}

type Deps = {
  baseUrl: string
  token: string
}

export function createStoreClient(deps: Deps) {
  const { baseUrl, token } = deps
  return {
    /** POST JSON to a Store route and parse the response with Store's published schema. */
    async post<S extends z.ZodType>(path: string, body: unknown, schema: S) {
      let res: Response
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        })
      } catch {
        throw new StoreUnavailableError()
      }
      if (res.status === 400) throw new StoreRejectedError()
      if (!res.ok) throw new StoreUnavailableError()
      return schema.parse(await res.json())
    },
  }
}

export type StoreClient = ReturnType<typeof createStoreClient>
