import { createGetHealthHandler, createHealthService, createHttpServer } from '@bbferm/http-server'
import { StoreErrorEnvelope, StoreHealthResponse, storeRoutes } from '@bbferm/store-schema'
import { afterEach, describe, expect, it } from 'vitest'

/** Same wiring as main.ts, without listening. */
function compose() {
  const healthService = createHealthService({ version: 'test' })
  const server = createHttpServer({ logLevel: 'fatal' })
  server.route(createGetHealthHandler({ healthService, url: storeRoutes.health }))
  return { server, healthService }
}

let app: ReturnType<typeof compose>
afterEach(() => app?.server.close())

// Store's published schema must describe what the shared http-server actually returns.
describe('store api matches @bbferm/store-schema', () => {
  it('health', async () => {
    app = compose()
    app.healthService.setServing()
    const res = await app.server.inject({ method: 'GET', url: storeRoutes.health })
    expect(res.statusCode).toBe(200)
    expect(StoreHealthResponse.parse(res.json())).toMatchObject({ status: 'serving' })
  })

  it('error envelope', async () => {
    app = compose()
    const res = await app.server.inject({ method: 'GET', url: '/internal/v1/nope' })
    expect(res.statusCode).toBe(404)
    expect(StoreErrorEnvelope.parse(res.json()).error.code).toBe('NOT_FOUND')
  })
})
