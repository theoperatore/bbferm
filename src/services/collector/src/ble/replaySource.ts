import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import type { AdvertisementSource } from './advertisementSource.js'

const Fixture = z.array(
  z.object({
    manufacturerDataHex: z.string().regex(/^[0-9a-fA-F]+$/),
    rssi: z.number().int().optional(),
  }),
)

type Deps = {
  file: string
  intervalMs?: number
}

/** Replays captured advertisements in a loop for development without BLE hardware. */
export function createReplaySource(deps: Deps) {
  const { file, intervalMs = 5000 } = deps
  let timer: NodeJS.Timeout | undefined

  const source: AdvertisementSource = {
    async start(onAdvertisement) {
      const fixtures = Fixture.parse(JSON.parse(await readFile(file, 'utf8')))
      if (fixtures.length === 0) return
      let i = 0
      timer = setInterval(() => {
        const f = fixtures[i++ % fixtures.length]
        if (!f) return
        onAdvertisement({
          manufacturerData: Buffer.from(f.manufacturerDataHex, 'hex'),
          ...(f.rssi === undefined ? {} : { rssi: f.rssi }),
          receivedAt: new Date(),
        })
      }, intervalMs)
    },
    async stop() {
      clearInterval(timer)
    },
  }
  return source
}
