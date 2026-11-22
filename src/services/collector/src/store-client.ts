import { type MeasurementIngestRequest, MeasurementIngestResponse, storeRoutes } from '@bbferm/store-schema'
import type { Logger } from './log.js'

export interface SubmitterOptions {
  storeUrl: string
  token: string
  queueMax: number
  log: Logger
  fetch?: typeof fetch
}

/**
 * Submits measurements to Store with a bounded in-memory queue and bounded
 * exponential backoff. Each measurement keeps its ID across retries so Store
 * can deduplicate. When the queue is full the oldest reading is dropped.
 */
export class MeasurementSubmitter {
  readonly #queue: MeasurementIngestRequest[] = []
  #draining = false
  #stopped = false
  #backoffMs = 0
  readonly #fetch: typeof fetch

  constructor(private readonly opts: SubmitterOptions) {
    this.#fetch = opts.fetch ?? fetch
  }

  get size(): number {
    return this.#queue.length
  }

  enqueue(m: MeasurementIngestRequest): void {
    if (this.#queue.length >= this.opts.queueMax) {
      const dropped = this.#queue.shift()
      this.opts.log.warn('queue full; dropping oldest measurement', { id: dropped?.id })
    }
    this.#queue.push(m)
    void this.drain()
  }

  stop(): void {
    this.#stopped = true
  }

  async drain(): Promise<void> {
    if (this.#draining) return
    this.#draining = true
    try {
      while (!this.#stopped && this.#queue.length > 0) {
        const next = this.#queue[0]!
        if (await this.#submit(next)) {
          this.#queue.shift()
          this.#backoffMs = 0
        } else {
          this.#backoffMs = Math.min(Math.max(this.#backoffMs * 2, 1000), 60_000)
          this.opts.log.warn('store submission failed; backing off', { ms: this.#backoffMs, queued: this.#queue.length })
          await new Promise((r) => setTimeout(r, this.#backoffMs))
        }
      }
    } finally {
      this.#draining = false
    }
  }

  async #submit(m: MeasurementIngestRequest): Promise<boolean> {
    try {
      const res = await this.#fetch(`${this.opts.storeUrl}${storeRoutes.measurements}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.opts.token}` },
        body: JSON.stringify(m),
        signal: AbortSignal.timeout(5000),
      })
      if (res.status === 400) {
        // Not retryable: drop it rather than block the queue forever.
        this.opts.log.error('store rejected measurement', { id: m.id })
        return true
      }
      if (!res.ok) return false
      const body = MeasurementIngestResponse.parse(await res.json())
      this.opts.log.debug('measurement submitted', { id: body.id, created: body.created })
      return true
    } catch (err) {
      this.opts.log.debug('store request error', { error: String(err) })
      return false
    }
  }
}
