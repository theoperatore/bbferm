import type { Advertisement } from '../ble/advertisementSource.js'
import type { ReadingService } from '../services/readingService.js'
import { decodeTilt } from '../tilt/decode.js'

type Deps = {
  readingService: ReadingService
}

/**
 * Inbound BLE advertisement handler. Parses and validates the payload
 * (non-Tilt and battery broadcasts are ignored), then delegates. No business logic.
 */
export function createAdvertisementHandler(deps: Deps) {
  const { readingService } = deps
  return function handleAdvertisement(ad: Advertisement) {
    const reading = decodeTilt(ad.manufacturerData, ad.rssi)
    if (!reading) return
    readingService.record(reading, ad.receivedAt)
  }
}
