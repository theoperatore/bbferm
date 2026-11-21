import type { Measurement, MeasurementIngest } from '@bbferm/contracts'

/**
 * Persistence boundary. The in-memory implementation is a stand-in until the
 * SQLite driver is selected and validated on the Pi (Milestone 3).
 */
export interface MeasurementRepository {
  /** Returns `created: false` if the ID was already recorded. */
  ingest(m: MeasurementIngest): Promise<{ created: boolean }>
  latest(): Promise<Measurement[]>
}

export class InMemoryMeasurementRepository implements MeasurementRepository {
  readonly #byId = new Map<string, Measurement>()

  async ingest(m: MeasurementIngest): Promise<{ created: boolean }> {
    if (this.#byId.has(m.id)) return { created: false }
    this.#byId.set(m.id, {
      id: m.id,
      batchId: null,
      deviceId: m.deviceId,
      source: m.source,
      observedAt: null,
      receivedAt: m.receivedAt,
      rawGravity: m.rawGravity,
      gravity: m.gravity,
      rawTemperature: m.rawTemperature,
      temperatureC: m.temperatureC,
      qualityFlags: m.qualityFlags,
      createdAt: new Date().toISOString(),
    })
    return { created: true }
  }

  async latest(): Promise<Measurement[]> {
    const latestByDevice = new Map<string, Measurement>()
    for (const m of this.#byId.values()) {
      const key = m.deviceId ?? 'manual'
      const prev = latestByDevice.get(key)
      if (!prev || prev.receivedAt < m.receivedAt) latestByDevice.set(key, m)
    }
    return [...latestByDevice.values()]
  }
}
