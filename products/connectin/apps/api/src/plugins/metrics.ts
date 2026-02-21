import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import client from 'prom-client';

export default fp(async function metricsPlugin(
  fastify: FastifyInstance
) {
  // Create a Registry
  const register = new client.Registry();

  // Add default metrics (CPU, memory, event loop, etc.)
  client.collectDefaultMetrics({ register });

  // Custom metrics
  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  // Hook into request lifecycle
  fastify.addHook('onResponse', (request, reply, done) => {
    const route =
      request.routeOptions?.url || request.url;
    const labels = {
      method: request.method,
      route,
      status_code: reply.statusCode.toString(),
    };
    httpRequestDuration.observe(
      labels,
      reply.elapsedTime / 1000
    );
    httpRequestTotal.inc(labels);
    done();
  });

  // Expose /metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}, { name: 'metrics' });
