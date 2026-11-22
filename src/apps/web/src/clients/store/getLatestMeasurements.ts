import '@tanstack/react-start/server-only'
import { LatestMeasurementsResponse, type StoreMeasurement, storeRoutes } from '@bbferm/store-schema'
import { storeClient } from './client'

export interface IGetLatestMeasurementsRequest {}

export type GetLatestMeasurementsResponse = {
  measurements: StoreMeasurement[]
}

/** Latest reading per device. */
export async function getLatestMeasurements(request: IGetLatestMeasurementsRequest) {
  const response: GetLatestMeasurementsResponse = await storeClient().get(
    storeRoutes.latestMeasurements,
    LatestMeasurementsResponse,
  )
  return response
}
