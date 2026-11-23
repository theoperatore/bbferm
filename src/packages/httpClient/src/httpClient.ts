import type { z } from 'zod';

/** The service answered with a 4xx other than 408/429. Retrying the same request won't help. */
export class HttpRequestRejectedError extends Error {
  constructor(readonly status: number) {
    super(`Request rejected with status ${status}`);
  }
}

/** The service is unreachable, timed out, or answered 5xx/408/429. Retryable. */
export class HttpServiceUnavailableError extends Error {
  constructor(readonly status?: number) {
    super(status ? `Service unavailable (status ${status})` : 'Service unreachable');
  }
}

type Deps = {
  baseUrl: string;
  /** Sent as `Authorization: Bearer <token>` when set. */
  token?: string;
  timeoutMs?: number;
};

/**
 * Fetch-based client for BBFerm services. Responses are parsed with the
 * provider's published schema. Works in Node and in the TanStack Start server.
 */
export function createHttpClient(deps: Deps) {
  const { baseUrl, token, timeoutMs = 5000 } = deps;

  async function request<S extends z.ZodType>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    schema: S,
    body?: unknown,
  ) {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers['content-type'] = 'application/json';

    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new HttpServiceUnavailableError();
    }
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      throw new HttpRequestRejectedError(res.status);
    }
    if (!res.ok) throw new HttpServiceUnavailableError(res.status);
    return schema.parse(await res.json());
  }

  return {
    get: <S extends z.ZodType>(path: string, schema: S) => request('GET', path, schema),
    post: <S extends z.ZodType>(path: string, body: unknown, schema: S) => request('POST', path, schema, body),
    patch: <S extends z.ZodType>(path: string, body: unknown, schema: S) => request('PATCH', path, schema, body),
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
