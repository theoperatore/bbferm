import type { TiltRawPayload } from '@bbferm/store-schema'
import { TILT_UUIDS, type TiltColor } from './colors.js'

export type TiltReading = NonNullable<ReturnType<typeof decodeTilt>>

const APPLE_COMPANY_ID = 0x004c
const IBEACON_TYPE = 0x02
const IBEACON_LENGTH = 0x15
/** Tilts periodically broadcast 999 °F; the tx-power byte then carries battery age, not a reading. */
const BATTERY_SENTINEL_F = 999

/**
 * Decode BLE manufacturer-specific data from a Tilt iBeacon advertisement.
 * Expects the 25-byte payload beginning with the little-endian company ID.
 * Returns `null` for anything that is not a Tilt temperature/gravity reading.
 */
export function decodeTilt(manufacturerData: Uint8Array, rssi?: number) {
  if (manufacturerData.length < 25) return null
  const view = new DataView(manufacturerData.buffer, manufacturerData.byteOffset, manufacturerData.byteLength)
  if (view.getUint16(0, true) !== APPLE_COMPANY_ID) return null
  if (view.getUint8(2) !== IBEACON_TYPE || view.getUint8(3) !== IBEACON_LENGTH) return null

  const uuid = Buffer.from(manufacturerData.subarray(4, 20)).toString('hex')
  const color = (TILT_UUIDS as Record<string, TiltColor | undefined>)[uuid]
  if (!color) return null

  const major = view.getUint16(20, false)
  const minor = view.getUint16(22, false)
  const txPower = view.getInt8(24)
  if (major === BATTERY_SENTINEL_F) return null

  const highResolution = minor > 5000
  const raw: TiltRawPayload = { version: 1, uuid, major, minor, txPower, ...(rssi === undefined ? {} : { rssi }) }

  return {
    color,
    /** Tilt Pro / HD reports with one extra decimal of precision. */
    highResolution,
    gravity: highResolution ? minor / 10000 : minor / 1000,
    temperatureF: highResolution ? major / 10 : major,
    raw,
  }
}
