import type { FastifyReply } from 'fastify';

/**
 * Sends the shared error envelope: `{ error: { code, message, requestId } }`.
 * Each service publishes the codes it can return in its schema package.
 * Never include stack traces, SQL, paths, or secrets.
 */
export function sendError(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message, requestId: reply.request.id } });
}
