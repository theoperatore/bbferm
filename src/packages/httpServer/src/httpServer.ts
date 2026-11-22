import Fastify from 'fastify'
import { sendError } from './errorEnvelope.js'

type Deps = {
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
}

/** Fastify instance with the shared error and not-found behavior. Services register their own routes. */
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

export type HttpServer = ReturnType<typeof createHttpServer>
