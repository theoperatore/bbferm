import type { AdvertisementSource } from '../source.js'

/**
 * BlueZ-backed BLE scanner. Library selection is deferred until it has been
 * validated on the Raspberry Pi Zero 2 W (Milestone 4).
 */
export class BluezSource implements AdvertisementSource {
  async start(): Promise<void> {
    throw new Error('BlueZ source is not implemented yet; use COLLECTOR_SOURCE=replay')
  }

  async stop(): Promise<void> {}
}
