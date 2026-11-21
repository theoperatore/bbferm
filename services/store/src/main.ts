import { loadConfig } from './config.js'
import { buildApp } from './app.js'
import { InMemoryMeasurementRepository } from './repository.js'

const config = loadConfig()
const app = buildApp({ config, measurements: new InMemoryMeasurementRepository() })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, 'shutting down')
    await app.close()
    process.exit(0)
  })
}

await app.listen({ host: config.STORE_HOST, port: config.STORE_PORT })
