/**
 * Prometheus metrics endpoint.
 *
 * `@connectsw/observability` exposes JSON route metrics at `/internal/metrics`;
 * this plugin additionally exposes the Prometheus text exposition format at
 * `GET /metrics` (default-process metrics + an HTTP request histogram), which
 * is what tasks.md T014 and the standard scrape target expect.
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

const prometheusPlugin: FastifyPluginAsync = async (app) => {
  const registry = new Registry();
  registry.setDefaultLabels({ service: 'credit-os-api' });
  collectDefaultMetrics({ register: registry });

  const httpDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
    registers: [registry],
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = request.routeOptions?.url ?? request.url;
    httpDuration.observe(
      {
        method: request.method,
        route,
        status_code: String(reply.statusCode),
      },
      reply.elapsedTime,
    );
  });

  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
};

export default fp(prometheusPlugin, { name: 'credit-os-prometheus' });
