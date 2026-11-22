import { type StoreHealthResponse, storeRoutes } from '@bbferm/store-schema'
import type { RouteOptions } from 'fastify'
import type { HealthService } from '../services/healthService.js'

type Deps = {
  healthService: HealthService
}

/** Unauthenticated so probes can call it. 503 until Store is serving. */
export function createGetHealthHandler(deps: Deps) {
  const { healthService } = deps
  return {
    method: 'GET',
    url: storeRoutes.health,
    handler: async (_request, reply) => {
      const body: StoreHealthResponse = healthService.check()
      return reply.code(body.status === 'serving' ? 200 : 503).send(body)
    },
  } satisfies RouteOptions
}
