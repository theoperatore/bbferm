import { createFileRoute } from '@tanstack/react-router'
import type { HealthResponse } from '@bbferm/contracts'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const body: HealthResponse = {
          status: 'ok',
          service: 'web',
          version: '0.0.0',
          time: new Date().toISOString(),
        }
        return Response.json(body, { headers: { 'cache-control': 'no-store' } })
      },
    },
  },
})
