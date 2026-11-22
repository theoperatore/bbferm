import type { AdvertisementSource } from './advertisementSource.js'

/**
 * BlueZ-backed BLE scanner. Library selection is deferred until it has been
 * validated on the Raspberry Pi Zero 2 W (Milestone 4).
 */
export function createBluezSource() {
  const source: AdvertisementSource = {
    async start() {
      throw new Error('BlueZ source is not implemented yet; use COLLECTOR_SOURCE=replay')
    },
    async stop() {},
  }
  return source
}
