import { HttpServiceUnavailableError } from '@bbferm/http-client'
import { createServerFn } from '@tanstack/react-start'
import { getHealth } from '../../../clients/store/getHealth'
import { StoreHealth } from './storeHealth.schemas'

/** BFF: whether Store is serving. Proves the browser → Start → Store path. */
export const getStoreHealth = createServerFn({ method: 'GET' }).handler(async () => {
  // TODO(auth): authenticate the browser session (single- vs multi-user is an open question in docs/decisions.md).
  const checkedAt = new Date().toISOString()
  try {
    const health = await getHealth({})
    return StoreHealth.parse({ store: health.status === 'serving' ? 'serving' : 'unavailable', checkedAt })
  } catch (err) {
    if (err instanceof HttpServiceUnavailableError) return StoreHealth.parse({ store: 'unavailable', checkedAt })
    throw err
  }
})
