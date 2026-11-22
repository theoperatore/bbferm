import { randomUUID } from 'node:crypto'
import { type MeasurementIngestRequest, storeRoutes } from '@bbferm/store-schema'
import { afterEach, describe, expect, it } from 'vitest'
import { createCallerAuth } from '../src/auth/callerAuth.js'
import { createGetHealthHandler } from '../src/handlers/getHealth.js'
import { createGetLatestMeasurementsHandler } from '../src/handlers/getLatestMeasurements.js'
import { createGetStatusHandler } from '../src/handlers/getStatus.js'
import { createIngestMeasurementHandler } from '../src/handlers/ingestMeasurement.js'
import { createHttpServer } from '../src/http/server.js'
import { createHealthService } from '../src/services/healthService.js'
import { createMeasurementService } from '../src/services/measurementService.js'
import { createStatusService } from '../src/services/statusService.js'
import { createInMemoryDatabase } from '../src/stores/inMemoryDatabase.js'
import { createInMemoryMeasurementStore } from '../src/stores/measurementStore.js'

const tokens = { webToken: 'web-token-123', collectorToken: 'collector-token-123' }
const web = { authorization: `Bearer ${tokens.webToken}` }
const collector = { authorization: `Bearer ${tokens.collectorToken}` }

/** Same wiring as main.ts, without listening. */
function compose() {
  const database = createInMemoryDatabase()
  const measurementStore = createInMemoryMeasurementStore({ database })
  const healthService = createHealthService({ version: 'test' })
  const statusService = createStatusService({ database })
  const measurementService = createMeasurementService({ measurementStore })
  const auth = createCallerAuth(tokens)
  const server = createHttpServer({ logLevel: 'fatal' })
  server.route(createGetHealthHandler({ healthService }))
  server.route(createGetStatusHandler({ auth, statusService }))
  server.route(createIngestMeasurementHandler({ auth, measurementService }))
  server.route(createGetLatestMeasurementsHandler({ auth, measurementService }))
  return { server, healthService }
}

function sample() {
  const measurement: MeasurementIngestRequest = {
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
  }
  return measurement
}

let app: ReturnType<typeof compose>
afterEach(() => app?.server.close())

describe('store api', () => {
  it('reports not_serving (503) until serving, without credentials', async () => {
    app = compose()
    const before = await app.server.inject({ method: 'GET', url: storeRoutes.health })
    expect(before.statusCode).toBe(503)
    expect(before.json()).toMatchObject({ status: 'not_serving' })

    app.healthService.setServing()
    const after = await app.server.inject({ method: 'GET', url: storeRoutes.health })
    expect(after.statusCode).toBe(200)
    expect(after.json()).toMatchObject({ status: 'serving' })
  })

  it('rejects missing credentials with the error envelope', async () => {
    app = compose()
    const res = await app.server.inject({ method: 'GET', url: storeRoutes.status })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })

  it('rejects invalid ingest bodies', async () => {
    app = compose()
    const res = await app.server.inject({
      method: 'POST',
      url: storeRoutes.measurements,
      headers: collector,
      payload: { id: 'not-a-uuid' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('ingests measurements idempotently', async () => {
    app = compose()
    const m = sample()
    const first = await app.server.inject({
      method: 'POST',
      url: storeRoutes.measurements,
      headers: collector,
      payload: m,
    })
    const second = await app.server.inject({
      method: 'POST',
      url: storeRoutes.measurements,
      headers: collector,
      payload: m,
    })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual({ id: m.id, created: false })

    const latest = await app.server.inject({ method: 'GET', url: storeRoutes.latestMeasurements, headers: web })
    expect(latest.json().measurements).toHaveLength(1)
  })

  it('does not let the web credential ingest measurements', async () => {
    app = compose()
    const res = await app.server.inject({
      method: 'POST',
      url: storeRoutes.measurements,
      headers: web,
      payload: sample(),
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('FORBIDDEN')
  })
})
