import { createServerFn } from '@tanstack/react-start'
import { LatestMeasurementsResponse } from '@bbferm/contracts'
import { storeGet } from './store-client.server'

/** BFF: latest reading per device. Response is validated against the shared contract. */
export const getLatestMeasurements = createServerFn({ method: 'GET' }).handler(async () => {
  // TODO(auth): authenticate the browser session before calling Store.
  return storeGet('/measurements/latest', LatestMeasurementsResponse)
})
