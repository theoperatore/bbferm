export interface Advertisement {
  /** Manufacturer-specific data including the 2-byte company ID. */
  manufacturerData: Uint8Array
  rssi?: number
  receivedAt: Date
}

/** A stream of BLE advertisements. Implementations: fixture replay (dev), BlueZ (Pi). */
export interface AdvertisementSource {
  start(onAdvertisement: (ad: Advertisement) => void): Promise<void>
  stop(): Promise<void>
}
