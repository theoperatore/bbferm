export const STORE_API_PREFIX = '/internal/v1';

/** Store route paths, relative to the Store base URL. */
export const storeRoutes = {
  health: `${STORE_API_PREFIX}/health`,
  // TODO(M3): add routes as Store endpoints are implemented (docs/api-contracts.md lists the planned set).
} as const;
