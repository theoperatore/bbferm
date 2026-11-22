import type { StoreErrorCode, StoreErrorEnvelope } from '@bbferm/store-schema'
import type { FastifyReply } from 'fastify'

/** Sends Store's stable error envelope. Never include stack traces, SQL, paths, or secrets. */
export function sendError(reply: FastifyReply, status: number, code: StoreErrorCode, message: string) {
  const body: StoreErrorEnvelope = { error: { code, message, requestId: reply.request.id } }
  return reply.code(status).send(body)
}
