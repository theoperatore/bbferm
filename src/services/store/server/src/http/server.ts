import Fastify from 'fastify'
import type { StoreConfig } from '../config.js'
import { sendError } from './errorEnvelope.js'

type Deps = {
  logLevel: StoreConfig['LOG_LEVEL']
}

/** Fastify instance with Store's error and not-found behavior. Routes are registered by main.ts. */
export function createHttpServer(deps: Deps) {
  const { logLevel } = deps
  const server = Fastify({ logger: { level: logLevel } })

  server.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'unhandled error')
    return sendError(reply, 500, 'INTERNAL_ERROR', 'An internal error occurred.')
  })
  server.setNotFoundHandler((_request, reply) => sendError(reply, 404, 'NOT_FOUND', 'Not found.'))

  return server
}
