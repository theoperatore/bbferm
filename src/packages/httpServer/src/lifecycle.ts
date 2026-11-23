import type { FastifyInstance } from 'fastify';
import type { HealthService } from './health.js';

type Deps = {
  fastify: FastifyInstance;
  health: HealthService;
  host: string;
  port: number;
};

/**
 * Listens, then reports `serving`. On SIGINT/SIGTERM it reports `not_serving`,
 * closes the server, and exits. Used by `HttpServer.start`; not exported.
 */
export async function startHttpServer(deps: Deps) {
  const { fastify, health, host, port } = deps;

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      fastify.log.info({ signal }, 'shutting down');
      health.setNotServing();
      await fastify.close();
      process.exit(0);
    });
  }

  await fastify.listen({ host, port });
  health.setServing();
}
