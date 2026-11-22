import type { RouteOptions } from 'fastify'
import { type LatestMeasurementsResponse, storeRoutes } from '@bbferm/store-schema'
import type { CallerAuth } from '../auth/caller-auth.js'
import type { MeasurementService } from '../services/measurement-service.js'

type Deps = {
  auth: CallerAuth
  measurementService: MeasurementService
}

export function createGetLatestMeasurementsHandler(deps: Deps) {
  const { auth, measurementService } = deps
  return {
    method: 'GET',
    url: storeRoutes.latestMeasurements,
    handler: async (request, reply) => {
      if (!auth.authorize(request, reply, ['web'])) return reply
      const body: LatestMeasurementsResponse = { measurements: await measurementService.getLatest() }
      return reply.send(body)
    },
  } satisfies RouteOptions
}
