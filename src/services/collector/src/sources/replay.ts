import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import type { Advertisement, AdvertisementSource } from '../source.js'

const Fixture = z.array(
  z.object({
    manufacturerDataHex: z.string().regex(/^[0-9a-fA-F]+$/),
    rssi: z.number().int().optional(),
  }),
)

/** Replays captured advertisements in a loop for development without BLE hardware. */
export class ReplaySource implements AdvertisementSource {
  #timer: NodeJS.Timeout | undefined

  constructor(
    private readonly file: string,
    private readonly intervalMs = 5000,
  ) {}

  async start(onAdvertisement: (ad: Advertisement) => void): Promise<void> {
    const fixtures = Fixture.parse(JSON.parse(await readFile(this.file, 'utf8')))
    if (fixtures.length === 0) return
    let i = 0
    this.#timer = setInterval(() => {
      const f = fixtures[i++ % fixtures.length]!
      onAdvertisement({
        manufacturerData: Buffer.from(f.manufacturerDataHex, 'hex'),
        ...(f.rssi === undefined ? {} : { rssi: f.rssi }),
        receivedAt: new Date(),
      })
    }, this.intervalMs)
  }

  async stop(): Promise<void> {
    clearInterval(this.#timer)
  }
}
