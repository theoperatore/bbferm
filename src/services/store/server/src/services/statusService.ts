import type { InMemoryDatabase } from '../stores/inMemoryDatabase.js'

type Deps = {
  database: InMemoryDatabase
}

/** Database and schema status for operators. */
export function createStatusService(deps: Deps) {
  const { database } = deps
  return {
    getStatus() {
      return database.describe()
    },
  }
}

export type StatusService = ReturnType<typeof createStatusService>
