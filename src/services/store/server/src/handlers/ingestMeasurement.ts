import { MeasurementIngestRequest, type MeasurementIngestResponse, storeRoutes } from '@bbferm/store-schema'
import type { RouteOptions } from 'fastify'
import type { CallerAuth } from '../auth/callerAuth.js'
import { sendError } from '../http/errorEnvelope.js'
import type { MeasurementService } from '../services/measurementService.js'

type Deps = {
  auth: CallerAuth
  measurementService: MeasurementService
}

export function createIngestMeasurementHandler(deps: Deps) {
  const { auth, measurementService } = deps
  return {
    method: 'POST',
    url: storeRoutes.measurements,
    handler: async (request, reply) => {
      if (!auth.authorize(request, reply, ['collector'])) return reply
      const parsed = MeasurementIngestRequest.safeParse(request.body)
      if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'The request is invalid.')

      const body: MeasurementIngestResponse = await measurementService.ingest(parsed.data)
      return reply.code(body.created ? 201 : 200).send(body)
    },
  } satisfies RouteOptions
}
