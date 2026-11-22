import type { RouteOptions } from 'fastify'
import { type StoreStatusResponse, storeRoutes } from '@bbferm/store-schema'
import type { CallerAuth } from '../auth/caller-auth.js'
import type { StatusService } from '../services/status-service.js'

type Deps = {
  auth: CallerAuth
  statusService: StatusService
}

export function createGetStatusHandler(deps: Deps) {
  const { auth, statusService } = deps
  return {
    method: 'GET',
    url: storeRoutes.status,
    handler: async (request, reply) => {
      if (!auth.authorize(request, reply, ['web'])) return reply
      const body: StoreStatusResponse = statusService.getStatus()
      return reply.send(body)
    },
  } satisfies RouteOptions
}
