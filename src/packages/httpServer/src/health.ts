import type { RouteOptions } from 'fastify'

type HealthServiceDeps = {
  version: string
}

/** Serving state for health checks. Starts `not_serving`; `startHttpServer` flips it once listening. */
export function createHealthService(deps: HealthServiceDeps) {
  const { version } = deps
  let status: 'serving' | 'not_serving' = 'not_serving'

  return {
    setServing() {
      status = 'serving'
    },
    setNotServing() {
      status = 'not_serving'
    },
    check() {
      return { status, version, time: new Date().toISOString() }
    },
  }
}

export type HealthService = ReturnType<typeof createHealthService>

type HealthHandlerDeps = {
  healthService: HealthService
  url: string
}

/** Unauthenticated health route so probes can call it. 200 when serving, 503 otherwise. */
export function createGetHealthHandler(deps: HealthHandlerDeps) {
  const { healthService, url } = deps
  return {
    method: 'GET',
    url,
    handler: async (_request, reply) => {
      const body = healthService.check()
      return reply.code(body.status === 'serving' ? 200 : 503).send(body)
    },
  } satisfies RouteOptions
}
