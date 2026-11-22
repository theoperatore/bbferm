import { describe, expect, it } from 'vitest'
import { Id } from '@bbferm/domain'
import { tiltDeviceId } from '../src/tilt/deviceId.js'

describe('tiltDeviceId', () => {
  it('is a stable, valid UUID per color', () => {
    expect(tiltDeviceId('black')).toBe(tiltDeviceId('black'))
    expect(tiltDeviceId('black')).not.toBe(tiltDeviceId('red'))
    expect(Id.safeParse(tiltDeviceId('black')).success).toBe(true)
  })
})
