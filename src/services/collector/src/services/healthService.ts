import type { Logger } from '../log.js'

type Deps = {
  log: Logger
}

/**
 * Serving state. Starts `not_serving`; main.ts flips it once the advertisement
 * source is running. The collector has no inbound listener, so state changes
 * are reported through logs (journald).
 */
export function createHealthService(deps: Deps) {
  const { log } = deps
  let status: 'serving' | 'not_serving' = 'not_serving'

  function set(next: typeof status) {
    if (next === status) return
    status = next
    log.info('health', { status })
  }

  return {
    setServing: () => set('serving'),
    setNotServing: () => set('not_serving'),
    status: () => status,
  }
}

export type HealthService = ReturnType<typeof createHealthService>
