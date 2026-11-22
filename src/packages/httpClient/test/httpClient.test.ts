import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createHttpClient, HttpRequestRejectedError, HttpServiceUnavailableError } from '../src/httpClient.js'

let server: Server | undefined
afterEach(() => new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve())))

async function serve(status: number, body: unknown) {
  server = createServer((req, res) => {
    res.writeHead(status, { 'content-type': 'application/json', 'x-auth': req.headers.authorization ?? '' })
    res.end(JSON.stringify({ ...(body as object), auth: req.headers.authorization ?? null }))
  })
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return `http://127.0.0.1:${port}`
}

const Ok = z.object({ ok: z.boolean(), auth: z.string().nullable() })

describe('http client', () => {
  it('parses responses with the schema and sends the bearer token', async () => {
    const client = createHttpClient({ baseUrl: await serve(200, { ok: true }), token: 'secret' })
    expect(await client.get('/x', Ok)).toEqual({ ok: true, auth: 'Bearer secret' })
  })

  it('maps 4xx to a rejected error and 5xx to unavailable', async () => {
    const rejected = createHttpClient({ baseUrl: await serve(400, {}) })
    await expect(rejected.get('/x', Ok)).rejects.toBeInstanceOf(HttpRequestRejectedError)
    await new Promise<void>((resolve) => server?.close(() => resolve()))

    const unavailable = createHttpClient({ baseUrl: await serve(503, {}) })
    await expect(unavailable.get('/x', Ok)).rejects.toBeInstanceOf(HttpServiceUnavailableError)
  })

  it('maps connection failures to unavailable', async () => {
    const client = createHttpClient({ baseUrl: 'http://127.0.0.1:1' })
    await expect(client.get('/x', Ok)).rejects.toBeInstanceOf(HttpServiceUnavailableError)
  })
})
