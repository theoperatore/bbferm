import { timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { sendError } from '../http/errorEnvelope.js'

export type Caller = 'web' | 'collector'

type Deps = {
  webToken: string
  collectorToken: string
}

/** Identifies the calling service from its bearer token. Each caller has its own credential. */
export function createCallerAuth(deps: Deps) {
  const { webToken, collectorToken } = deps

  function identify(request: FastifyRequest) {
    const header = request.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (tokenMatches(token, webToken)) return 'web' as const
    if (tokenMatches(token, collectorToken)) return 'collector' as const
    return undefined
  }

  return {
    /**
     * Returns the caller if it is one of `allowed`. Otherwise sends 401/403
     * and returns `undefined`; the handler must then return without acting.
     */
    authorize(request: FastifyRequest, reply: FastifyReply, allowed: Caller[]) {
      const caller = identify(request)
      if (!caller) {
        sendError(reply, 401, 'UNAUTHORIZED', 'Missing or invalid service credential.')
        return undefined
      }
      if (!allowed.includes(caller)) {
        sendError(reply, 403, 'FORBIDDEN', 'Caller is not permitted for this operation.')
        return undefined
      }
      return caller
    },
  }
}

export type CallerAuth = ReturnType<typeof createCallerAuth>

function tokenMatches(presented: string, expected: string) {
  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
