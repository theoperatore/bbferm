import type { MeasurementIngestRequest, StoreMeasurement } from '@bbferm/store-contract'

/**
 * Persistence boundary. The in-memory implementation is a stand-in until the
 * SQLite driver is selected and validated on the Pi (Milestone 3).
 */
export interface MeasurementRepository {
  /** Returns `created: false` if the ID was already recorded. */
  ingest(m: MeasurementIngestRequest): Promise<{ created: boolean }>
  latest(): Promise<StoreMeasurement[]>
}

export class InMemoryMeasurementRepository implements MeasurementRepository {
  readonly #byId = new Map<string, StoreMeasurement>()

  async ingest(m: MeasurementIngestRequest): Promise<{ created: boolean }> {
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

  async latest(): Promise<StoreMeasurement[]> {
    const latestByDevice = new Map<string, StoreMeasurement>()
    for (const m of this.#byId.values()) {
      const key = m.deviceId ?? 'manual'
      const prev = latestByDevice.get(key)
      if (!prev || prev.receivedAt < m.receivedAt) latestByDevice.set(key, m)
    }
    return [...latestByDevice.values()]
  }
}
