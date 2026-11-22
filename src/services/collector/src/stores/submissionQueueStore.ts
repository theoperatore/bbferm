import type { MeasurementIngestRequest } from '@bbferm/store-schema'

/**
 * Measurements waiting to be accepted by Store. In memory for now; a durable
 * disk spool (/var/lib/bbferm/collector-spool) would be another implementation.
 */
export interface SubmissionQueueStore {
  /** Appends; when full, drops and returns the oldest entry. */
  push(measurement: MeasurementIngestRequest): MeasurementIngestRequest | undefined
  peek(): MeasurementIngestRequest | undefined
  shift(): void
  size(): number
}

type Deps = {
  maxSize: number
}

export function createInMemorySubmissionQueueStore(deps: Deps) {
  const { maxSize } = deps
  const queue: MeasurementIngestRequest[] = []

  const store: SubmissionQueueStore = {
    push(measurement) {
      const dropped = queue.length >= maxSize ? queue.shift() : undefined
      queue.push(measurement)
      return dropped
    },
    peek() {
      return queue[0]
    },
    shift() {
      queue.shift()
    },
    size() {
      return queue.length
    },
  }
  return store
}
