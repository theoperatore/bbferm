import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { type MeasurementIngestRequest, storeRoutes } from '@bbferm/store-contract'
import { buildApp } from '../src/app.js'
import { InMemoryMeasurementRepository } from '../src/repository.js'

const config = {
  STORE_WEB_TOKEN: 'web-token-123',
  STORE_COLLECTOR_TOKEN: 'collector-token-123',
  LOG_LEVEL: 'fatal' as const,
}

function makeApp() {
  return buildApp({ config, measurements: new InMemoryMeasurementRepository() })
}

const sample = (): MeasurementIngestRequest => ({
  id: randomUUID(),
  deviceId: randomUUID(),
  source: 'tilt',
  receivedAt: new Date().toISOString(),
  rawGravity: 1.042,
  gravity: 1.042,
  rawTemperature: 68,
  temperatureC: 20,
  rawPayload: { version: 1, uuid: 'a495bb30c5b14b44b5121370f02d74de', major: 68, minor: 1042, txPower: -59 },
  qualityFlags: [],
})

let app: ReturnType<typeof makeApp>
afterEach(() => app?.close())

describe('store api', () => {
  it('serves unauthenticated health', async () => {
    app = makeApp()
    const res = await app.inject({ method: 'GET', url: storeRoutes.health })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok' })
  })

  it('rejects missing credentials with the error envelope', async () => {
    app = makeApp()
    const res = await app.inject({ method: 'GET', url: storeRoutes.status })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })

  it('ingests measurements idempotently', async () => {
    app = makeApp()
    const m = sample()
    const headers = { authorization: `Bearer ${config.STORE_COLLECTOR_TOKEN}` }
    const first = await app.inject({ method: 'POST', url: storeRoutes.measurements, headers, payload: m })
    const second = await app.inject({ method: 'POST', url: storeRoutes.measurements, headers, payload: m })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual({ id: m.id, created: false })

    const latest = await app.inject({
      method: 'GET',
      url: storeRoutes.latestMeasurements,
      headers: { authorization: `Bearer ${config.STORE_WEB_TOKEN}` },
    })
    expect(latest.json().measurements).toHaveLength(1)
  })

  it('does not let the web credential ingest measurements', async () => {
    app = makeApp()
    const res = await app.inject({
      method: 'POST',
      url: storeRoutes.measurements,
      headers: { authorization: `Bearer ${config.STORE_WEB_TOKEN}` },
      payload: sample(),
    })
    expect(res.statusCode).toBe(403)
  })
})
