import { afterEach, describe, expect, it } from 'vitest'
import { createGetHealthHandler, createHealthService } from '../src/health.js'
import { createHttpServer } from '../src/httpServer.js'

function compose() {
  const healthService = createHealthService({ version: 'test' })
  const server = createHttpServer({ logLevel: 'fatal' })
  server.route(createGetHealthHandler({ healthService, url: '/health' }))
  return { server, healthService }
}

let app: ReturnType<typeof compose>
afterEach(() => app?.server.close())

describe('http server', () => {
  it('reports not_serving (503) until serving', async () => {
    app = compose()
    const before = await app.server.inject({ method: 'GET', url: '/health' })
    expect(before.statusCode).toBe(503)
    expect(before.json()).toMatchObject({ status: 'not_serving', version: 'test' })

    app.healthService.setServing()
    const after = await app.server.inject({ method: 'GET', url: '/health' })
    expect(after.statusCode).toBe(200)
    expect(after.json()).toMatchObject({ status: 'serving' })
  })

  it('returns the error envelope for unknown routes', async () => {
    app = compose()
    const res = await app.server.inject({ method: 'GET', url: '/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Not found.' } })
  })
})
