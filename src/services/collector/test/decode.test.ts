import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeTilt } from '../src/tilt/decode.js'

const fixtures: { manufacturerDataHex: string; rssi?: number }[] = JSON.parse(
  readFileSync(new URL('./fixtures/advertisements.json', import.meta.url), 'utf8'),
)
const ad = (i: number) => Buffer.from(fixtures[i]!.manufacturerDataHex, 'hex')

describe('decodeTilt', () => {
  it('decodes a standard Tilt', () => {
    const r = decodeTilt(ad(0), -70)
    expect(r).toMatchObject({ color: 'black', highResolution: false, gravity: 1.042, temperatureF: 68 })
    expect(r?.raw).toEqual({
      version: 1,
      uuid: 'a495bb30c5b14b44b5121370f02d74de',
      major: 68,
      minor: 1042,
      txPower: -59,
      rssi: -70,
    })
  })

  it('decodes a high-resolution Tilt Pro', () => {
    expect(decodeTilt(ad(1))).toMatchObject({ color: 'red', highResolution: true, gravity: 1.0423, temperatureF: 68.5 })
  })

  it('ignores the battery sentinel broadcast', () => {
    expect(decodeTilt(ad(2))).toBeNull()
  })

  it('ignores non-Tilt iBeacons and short payloads', () => {
    expect(decodeTilt(ad(3))).toBeNull()
    expect(decodeTilt(new Uint8Array([0x4c, 0x00]))).toBeNull()
  })
})
