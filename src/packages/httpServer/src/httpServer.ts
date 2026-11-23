import Fastify, { type FastifyInstance, type RouteOptions } from 'fastify';
import { sendError } from './errorEnvelope.js';
import { createGetHealthHandler, createHealthService, type HealthService } from './health.js';
import { startHttpServer } from './lifecycle.js';

type Deps = {
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  version: string;
  /** Where the health route is mounted, e.g. Store's `/internal/v1/health`. */
  healthPath?: string;
};

type StartOptions = {
  host: string;
  port: number;
};

// Declared because `route` returns the server itself, which TypeScript can't infer.
export type HttpServer = {
  /** Escape hatch to the underlying Fastify instance (inject in tests, plugins, logging). */
  fastify: FastifyInstance;
  /** Health state. `start` manages it; services may call `setNotServing()` on a fatal dependency failure. */
  health: HealthService;
  /** Registers a route; returns the server for chaining. */
  route(options: RouteOptions): HttpServer;
  /** Listens, then reports `serving`. Handles SIGINT/SIGTERM by reporting `not_serving` and closing. */
  start(options: StartOptions): Promise<void>;
};

/**
 * HTTP server with the shared error envelope, not-found handling, and a health
 * route (`GET healthPath`, default `/health`). Starts `not_serving`.
 *
 * ```ts
 * await createHttpServer({ logLevel, version })
 *   .route(createSomeHandler({ someService }))
 *   .start({ host, port });
 * ```
 */
export function createHttpServer(deps: Deps) {
  const { logLevel, version, healthPath = '/health' } = deps;
  const fastify = Fastify({ logger: { level: logLevel } });

  fastify.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'unhandled error');
    return sendError(reply, 500, 'INTERNAL_ERROR', 'An internal error occurred.');
  });
  fastify.setNotFoundHandler((_request, reply) => sendError(reply, 404, 'NOT_FOUND', 'Not found.'));

  const health = createHealthService({ version });
  fastify.route(createGetHealthHandler({ healthService: health, url: healthPath }));

  const server: HttpServer = {
    fastify,
    health,
    route(options) {
      fastify.route(options);
      return server;
    },
    start(options) {
      return startHttpServer({ fastify, health, ...options });
    },
  };
  return server;
}
