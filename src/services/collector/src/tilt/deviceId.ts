import { createHash } from 'node:crypto'

/** Fixed namespace for deriving stable Tilt device IDs (UUIDv5). */
const NAMESPACE = '6f1a3c1e-9b2f-4c8e-8f0d-2b7e5a4c9d10'

/**
 * Deterministic device ID per Tilt color. Placeholder until devices are
 * registered through the Store device API.
 */
export function tiltDeviceId(color: string) {
  const ns = Buffer.from(NAMESPACE.replaceAll('-', ''), 'hex')
  const hash = createHash('sha1').update(ns).update(`tilt:${color}`).digest()
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  const h = hash.subarray(0, 16).toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
