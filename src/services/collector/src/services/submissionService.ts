import type { MeasurementIngestRequest } from '@bbferm/store-schema'
import { StoreRejectedError } from '../clients/store/client.js'
import type { IngestMeasurement } from '../clients/store/ingestMeasurement.js'
import type { Logger } from '../log.js'
import type { SubmissionQueueStore } from '../stores/submissionQueueStore.js'

type Deps = {
  ingestMeasurement: IngestMeasurement
  queue: SubmissionQueueStore
  log: Logger
  backoff?: { initialMs: number; maxMs: number }
}

/**
 * Delivers measurements to Store in order, with bounded exponential backoff.
 * A measurement keeps its ID across retries so Store can deduplicate.
 */
export function createSubmissionService(deps: Deps) {
  const { ingestMeasurement, queue, log, backoff = { initialMs: 1000, maxMs: 60_000 } } = deps
  let draining = false
  let stopped = false
  let delayMs = 0

  async function drain() {
    if (draining) return
    draining = true
    try {
      for (let next = queue.peek(); !stopped && next; next = queue.peek()) {
        if (await submit(next)) {
          queue.shift()
          delayMs = 0
        } else {
          delayMs = Math.min(Math.max(delayMs * 2, backoff.initialMs), backoff.maxMs)
          log.warn('store submission failed; backing off', { ms: delayMs, queued: queue.size() })
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    } finally {
      draining = false
    }
  }

  /** `true` when the measurement is done with (accepted or permanently rejected). */
  async function submit(measurement: MeasurementIngestRequest) {
    try {
      const response = await ingestMeasurement({ measurement })
      log.debug('measurement submitted', { id: response.id, created: response.created })
      return true
    } catch (err) {
      if (err instanceof StoreRejectedError) {
        log.error('store rejected measurement; dropping', { id: measurement.id })
        return true
      }
      log.debug('store request error', { error: String(err) })
      return false
    }
  }

  return {
    enqueue(measurement: MeasurementIngestRequest) {
      const dropped = queue.push(measurement)
      if (dropped) log.warn('queue full; dropping oldest measurement', { id: dropped.id })
      void drain()
    },
    stop() {
      stopped = true
    },
    queued: () => queue.size(),
    /** Resolves once the current drain pass ends (for tests and shutdown). */
    drain,
  }
}

export type SubmissionService = ReturnType<typeof createSubmissionService>
