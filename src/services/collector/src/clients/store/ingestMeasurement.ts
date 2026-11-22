import { type MeasurementIngestRequest, MeasurementIngestResponse, storeRoutes } from '@bbferm/store-schema'
import type { StoreClient } from './client.js'

export interface IIngestMeasurementRequest {
  measurement: MeasurementIngestRequest
}

export type IngestMeasurementResponse = {
  id: string
  /** `false` when Store already had this measurement ID (idempotent replay). */
  created: boolean
}

type Deps = {
  storeClient: StoreClient
}

export function createIngestMeasurement(deps: Deps) {
  const { storeClient } = deps
  return async function ingestMeasurement(request: IIngestMeasurementRequest) {
    const response: IngestMeasurementResponse = await storeClient.post(
      storeRoutes.measurements,
      request.measurement,
      MeasurementIngestResponse,
    )
    return response
  }
}

export type IngestMeasurement = ReturnType<typeof createIngestMeasurement>
