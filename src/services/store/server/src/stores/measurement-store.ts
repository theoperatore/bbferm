import type { StoreMeasurement } from '@bbferm/store-schema'
import type { InMemoryDatabase } from './in-memory-database.js'

/** Measurement DAO. Persistence only; no business rules. */
export interface MeasurementStore {
  /** Inserts the record unless its ID already exists. */
  insertIfAbsent(record: StoreMeasurement): Promise<{ inserted: boolean }>
  /** Latest measurement per device (manual readings grouped together). */
  listLatestPerDevice(): Promise<StoreMeasurement[]>
}

type Deps = {
  database: InMemoryDatabase
}

export function createInMemoryMeasurementStore(deps: Deps) {
  const { database } = deps
  const store: MeasurementStore = {
    async insertIfAbsent(record) {
      if (database.measurements.has(record.id)) return { inserted: false }
      database.measurements.set(record.id, record)
      return { inserted: true }
    },
    async listLatestPerDevice() {
      const latest = new Map<string, StoreMeasurement>()
      for (const m of database.measurements.values()) {
        const key = m.deviceId ?? 'manual'
        const prev = latest.get(key)
        if (!prev || prev.receivedAt < m.receivedAt) latest.set(key, m)
      }
      return [...latest.values()]
    },
  }
  return store
}
