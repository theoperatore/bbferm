import { createFileRoute } from '@tanstack/react-router'
import type { WebHealthResponse } from '../../server/health.schemas'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const body: WebHealthResponse = {
          status: 'ok',
          version: '0.0.0',
          time: new Date().toISOString(),
        }
        return Response.json(body, { headers: { 'cache-control': 'no-store' } })
      },
    },
  },
})
