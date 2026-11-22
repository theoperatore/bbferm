import type { HealthService } from './health.js'
import type { HttpServer } from './httpServer.js'

type Deps = {
  server: HttpServer
  healthService: HealthService
  host: string
  port: number
}

/**
 * Starts listening, then reports `serving`. On SIGINT/SIGTERM it reports
 * `not_serving`, closes the server, and exits. Call this last in main.ts,
 * after every dependency and route has been constructed.
 */
export async function startHttpServer(deps: Deps) {
  const { server, healthService, host, port } = deps

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      server.log.info({ signal }, 'shutting down')
      healthService.setNotServing()
      await server.close()
      process.exit(0)
    })
  }

  await server.listen({ host, port })
  healthService.setServing()
}
