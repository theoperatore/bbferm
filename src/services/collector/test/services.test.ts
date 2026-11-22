import type { MeasurementIngestRequest } from '@bbferm/store-schema'
import { describe, expect, it, vi } from 'vitest'
import { StoreRejectedError, StoreUnavailableError } from '../src/clients/store/client.js'
import type { IIngestMeasurementRequest } from '../src/clients/store/ingestMeasurement.js'
import { createLogger } from '../src/log.js'
import { createReadingService } from '../src/services/readingService.js'
import { createSubmissionService } from '../src/services/submissionService.js'
import { createInMemorySubmissionQueueStore } from '../src/stores/submissionQueueStore.js'
import { decodeTilt } from '../src/tilt/decode.js'

const log = createLogger('error')
const backoff = { initialMs: 1, maxMs: 2 }
const measurement = (id: string) => ({ id }) as MeasurementIngestRequest

describe('submission service', () => {
  it('retries with the same measurement ID until Store accepts it', async () => {
    const ingestMeasurement = vi
      .fn<(r: IIngestMeasurementRequest) => Promise<{ id: string; created: boolean }>>()
      .mockRejectedValueOnce(new StoreUnavailableError())
      .mockResolvedValueOnce({ id: 'a', created: true })
    const queue = createInMemorySubmissionQueueStore({ maxSize: 10 })
    const service = createSubmissionService({ ingestMeasurement, queue, log, backoff })

    service.enqueue(measurement('a'))
    await vi.waitFor(() => expect(queue.size()).toBe(0))
    expect(ingestMeasurement.mock.calls.map(([r]) => r.measurement.id)).toEqual(['a', 'a'])
  })

  it('drops measurements Store rejects instead of blocking the queue', async () => {
    const ingestMeasurement = vi
      .fn<(r: IIngestMeasurementRequest) => Promise<{ id: string; created: boolean }>>()
      .mockRejectedValueOnce(new StoreRejectedError())
      .mockResolvedValueOnce({ id: 'b', created: true })
    const queue = createInMemorySubmissionQueueStore({ maxSize: 10 })
    const service = createSubmissionService({ ingestMeasurement, queue, log, backoff })

    service.enqueue(measurement('a'))
    service.enqueue(measurement('b'))
    await vi.waitFor(() => expect(queue.size()).toBe(0))
    expect(ingestMeasurement).toHaveBeenCalledTimes(2)
  })
})

describe('submission queue store', () => {
  it('drops the oldest entry when full', () => {
    const queue = createInMemorySubmissionQueueStore({ maxSize: 2 })
    queue.push(measurement('a'))
    queue.push(measurement('b'))
    expect(queue.push(measurement('c'))?.id).toBe('a')
    expect(queue.peek()?.id).toBe('b')
  })
})

describe('reading service', () => {
  const reading = decodeTilt(Buffer.from('4c000215a495bb30c5b14b44b5121370f02d74de00440412c5', 'hex'))!

  it('submits at most one reading per Tilt per interval, with quality flags and Celsius', () => {
    const enqueue = vi.fn()
    const service = createReadingService({ submissionService: { enqueue } as never, minIntervalS: 60, log })

    service.record(reading, new Date('2026-11-21T17:00:00Z'))
    service.record(reading, new Date('2026-11-21T17:00:30Z'))
    service.record(reading, new Date('2026-11-21T17:01:00Z'))

    expect(enqueue).toHaveBeenCalledTimes(2)
    expect(enqueue.mock.calls[0]![0]).toMatchObject({
      source: 'tilt',
      gravity: 1.042,
      temperatureC: 20,
      qualityFlags: ['uncalibrated'],
      receivedAt: '2026-11-21T17:00:00.000Z',
    })
  })
})
