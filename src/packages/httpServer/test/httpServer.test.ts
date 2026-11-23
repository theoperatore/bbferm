import type { RouteOptions } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpServer, type HttpServer } from '../src/httpServer.js';

let server: HttpServer | undefined;
afterEach(() => server?.fastify.close());

const ping = (url: string) =>
  ({
    method: 'GET',
    url,
    handler: async () => ({ pong: url }),
  }) satisfies RouteOptions;

describe('http server', () => {
  it('serves health at the default path: not_serving (503) until serving', async () => {
    server = createHttpServer({ logLevel: 'fatal', version: 'test' });
    const before = await server.fastify.inject({ method: 'GET', url: '/health' });
    expect(before.statusCode).toBe(503);
    expect(before.json()).toMatchObject({ status: 'not_serving', version: 'test' });

    server.health.setServing();
    const after = await server.fastify.inject({ method: 'GET', url: '/health' });
    expect(after.statusCode).toBe(200);
    expect(after.json()).toMatchObject({ status: 'serving' });
  });

  it('mounts health at a custom path', async () => {
    server = createHttpServer({ logLevel: 'fatal', version: 'test', healthPath: '/internal/v1/health' });
    server.health.setServing();
    expect((await server.fastify.inject({ method: 'GET', url: '/internal/v1/health' })).statusCode).toBe(200);
    expect((await server.fastify.inject({ method: 'GET', url: '/health' })).statusCode).toBe(404);
  });

  it('chains route registration', async () => {
    server = createHttpServer({ logLevel: 'fatal', version: 'test' }).route(ping('/a')).route(ping('/b'));
    expect((await server.fastify.inject({ method: 'GET', url: '/a' })).json()).toEqual({ pong: '/a' });
    expect((await server.fastify.inject({ method: 'GET', url: '/b' })).json()).toEqual({ pong: '/b' });
  });

  it('starts listening and reports serving', async () => {
    server = createHttpServer({ logLevel: 'fatal', version: 'test' });
    await server.start({ host: '127.0.0.1', port: 0 });
    expect(server.health.check().status).toBe('serving');
  });

  it('returns the error envelope for unknown routes', async () => {
    server = createHttpServer({ logLevel: 'fatal', version: 'test' });
    const res = await server.fastify.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });
});
