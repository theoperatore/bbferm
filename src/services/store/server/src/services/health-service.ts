type Deps = {
  version: string
}

/** Serving state for health checks. Starts `not_serving`; main.ts flips it once Store is listening. */
export function createHealthService(deps: Deps) {
  const { version } = deps
  let status: 'serving' | 'not_serving' = 'not_serving'

  return {
    setServing() {
      status = 'serving'
    },
    setNotServing() {
      status = 'not_serving'
    },
    check() {
      return { status, version, time: new Date().toISOString() }
    },
  }
}

export type HealthService = ReturnType<typeof createHealthService>
