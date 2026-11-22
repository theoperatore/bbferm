import type { StoreMeasurement } from '@bbferm/store-schema'

/**
 * In-memory stand-in for the SQLite connection until the driver is selected
 * and validated on the Pi. DAOs receive this the same way they will receive
 * the SQLite connection.
 */
export function createInMemoryDatabase() {
  return {
    measurements: new Map<string, StoreMeasurement>(),
    describe() {
      return { database: 'mock' as const, schemaVersion: 0 }
    },
  }
}

export type InMemoryDatabase = ReturnType<typeof createInMemoryDatabase>
