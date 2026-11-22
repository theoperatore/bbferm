export const STORE_API_PREFIX = '/internal/v1'

/** Store route paths, relative to the Store base URL. */
export const storeRoutes = {
  health: `${STORE_API_PREFIX}/health`,
  status: `${STORE_API_PREFIX}/status`,
  measurements: `${STORE_API_PREFIX}/measurements`,
  latestMeasurements: `${STORE_API_PREFIX}/measurements/latest`,
} as const
