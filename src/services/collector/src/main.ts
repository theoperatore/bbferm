import { randomUUID } from 'node:crypto'
import type { MeasurementIngest, QualityFlag } from '@bbferm/contracts'
import { fahrenheitToCelsius } from '@bbferm/domain'
import { loadConfig } from './config.js'
import { tiltDeviceId } from './device-id.js'
import { createLogger } from './log.js'
import type { AdvertisementSource } from './source.js'
import { BluezSource } from './sources/bluez.js'
import { ReplaySource } from './sources/replay.js'
import { MeasurementSubmitter } from './store-client.js'
import { decodeTilt } from './tilt/decode.js'

const config = loadConfig()
const log = createLogger(config.LOG_LEVEL)

const submitter = new MeasurementSubmitter({
  storeUrl: config.STORE_URL,
  token: config.STORE_COLLECTOR_TOKEN,
  queueMax: config.COLLECTOR_QUEUE_MAX,
  log,
})

const source: AdvertisementSource =
  config.COLLECTOR_SOURCE === 'replay' ? new ReplaySource(config.COLLECTOR_REPLAY_FILE) : new BluezSource()

const lastSubmitted = new Map<string, number>()

await source.start((ad) => {
  const reading = decodeTilt(ad.manufacturerData, ad.rssi)
  if (!reading) return

  const now = ad.receivedAt.getTime()
  const last = lastSubmitted.get(reading.color) ?? 0
  if (now - last < config.COLLECTOR_MIN_INTERVAL_S * 1000) return
  lastSubmitted.set(reading.color, now)

  const qualityFlags: QualityFlag[] = ['uncalibrated']
  if (reading.gravity < 0.98 || reading.gravity > 1.15) qualityFlags.push('gravity_out_of_range')
  if (reading.temperatureF < 25 || reading.temperatureF > 120) qualityFlags.push('temperature_out_of_range')

  const measurement: MeasurementIngest = {
    id: randomUUID(),
    deviceId: tiltDeviceId(reading.color),
    source: 'tilt',
    receivedAt: ad.receivedAt.toISOString(),
    rawGravity: reading.gravity,
    gravity: reading.gravity,
    rawTemperature: reading.temperatureF,
    temperatureC: fahrenheitToCelsius(reading.temperatureF),
    rawPayload: reading.raw,
    qualityFlags,
  }
  log.info('tilt reading', { color: reading.color, gravity: reading.gravity, temperatureF: reading.temperatureF })
  submitter.enqueue(measurement)
})

log.info('collector started', { source: config.COLLECTOR_SOURCE })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    log.info('shutting down', { signal, queued: submitter.size })
    submitter.stop()
    await source.stop()
    process.exit(0)
  })
}
