import { timingSafeEqual } from 'node:crypto'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import {
  type ErrorCode,
  type ErrorEnvelope,
  type HealthResponse,
  type LatestMeasurementsResponse,
  MeasurementIngest,
  type MeasurementIngestResponse,
  STORE_API_PREFIX,
  type StoreStatusResponse,
} from '@bbferm/contracts'
import type { StoreConfig } from './config.js'
import type { MeasurementRepository } from './repository.js'

type Caller = 'web' | 'collector'

declare module 'fastify' {
  interface FastifyRequest {
    caller?: Caller
  }
}

export interface AppDeps {
  config: Pick<StoreConfig, 'STORE_WEB_TOKEN' | 'STORE_COLLECTOR_TOKEN' | 'LOG_LEVEL'>
  measurements: MeasurementRepository
  version?: string
}

function sendError(reply: FastifyReply, status: number, code: ErrorCode, message: string) {
  const body: ErrorEnvelope = { error: { code, message, requestId: reply.request.id } }
  return reply.code(status).send(body)
}

function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function buildApp({ config, measurements, version = '0.0.0' }: AppDeps) {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } })

  // Service-credential authentication. Health is unauthenticated for probes.
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url === `${STORE_API_PREFIX}/health`) return
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (tokenMatches(token, config.STORE_WEB_TOKEN)) req.caller = 'web'
    else if (tokenMatches(token, config.STORE_COLLECTOR_TOKEN)) req.caller = 'collector'
    else return sendError(reply, 401, 'UNAUTHORIZED', 'Missing or invalid service credential.')
  })

  const requireCaller = (...allowed: Caller[]) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.caller || !allowed.includes(req.caller)) {
        return sendError(reply, 403, 'UNAUTHORIZED', 'Caller is not permitted for this operation.')
      }
    }

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled error')
    return sendError(reply, 500, 'INTERNAL_ERROR', 'An internal error occurred.')
  })

  app.setNotFoundHandler((req, reply) => sendError(reply, 404, 'NOT_FOUND', 'Not found.'))

  app.register(
    async (api) => {
      api.get('/health', async (): Promise<HealthResponse> => ({
        status: 'ok',
        service: 'store',
        version,
        time: new Date().toISOString(),
      }))

      api.get('/status', { preHandler: requireCaller('web') }, async (): Promise<StoreStatusResponse> => ({
        database: 'mock',
        schemaVersion: 0,
      }))

      api.post('/measurements', { preHandler: requireCaller('collector') }, async (req, reply) => {
        const parsed = MeasurementIngest.safeParse(req.body)
        if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'The request is invalid.')
        const { created } = await measurements.ingest(parsed.data)
        const body: MeasurementIngestResponse = { id: parsed.data.id, created }
        return reply.code(created ? 201 : 200).send(body)
      })

      api.get(
        '/measurements/latest',
        { preHandler: requireCaller('web') },
        async (): Promise<LatestMeasurementsResponse> => ({ measurements: await measurements.latest() }),
      )
    },
    { prefix: STORE_API_PREFIX },
  )

  return app
}
