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

  // Security metrics
  const authEventsTotal = new client.Counter({
    name: 'auth_events_total',
    help: 'Total number of authentication events',
    labelNames: ['event'],
    registers: [register],
  });

  const authFailuresTotal = new client.Counter({
    name: 'auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['reason'],
    registers: [register],
  });

  // DB connection pool gauge
  const dbConnectionPool = new client.Gauge({
    name: 'db_connection_pool_active',
    help: 'Number of active database connections',
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

    // Track auth events via status codes on auth routes
    if (route?.startsWith('/api/v1/auth/')) {
      if (route.includes('/login') && request.method === 'POST') {
        if (reply.statusCode === 200) {
          authEventsTotal.inc({ event: 'login_success' });
        } else if (reply.statusCode === 401) {
          authFailuresTotal.inc({ reason: 'invalid_credentials' });
        } else if (reply.statusCode === 429) {
          authFailuresTotal.inc({ reason: 'rate_limited' });
        }
      } else if (route.includes('/register') && request.method === 'POST' && reply.statusCode === 201) {
        authEventsTotal.inc({ event: 'register' });
      } else if (route.includes('/logout') && reply.statusCode === 200) {
        authEventsTotal.inc({ event: 'logout' });
      } else if (route.includes('/refresh') && request.method === 'POST') {
        if (reply.statusCode === 200) {
          authEventsTotal.inc({ event: 'token_refresh' });
        } else if (reply.statusCode === 401) {
          authFailuresTotal.inc({ reason: 'invalid_refresh_token' });
        }
      }
    }

    done();
  });

  // Periodically update DB pool gauge (every 30s)
  const poolInterval = setInterval(async () => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      dbConnectionPool.set(1); // Connection healthy
    } catch {
      dbConnectionPool.set(0);
    }
  }, 30000);

  fastify.addHook('onClose', async () => {
    clearInterval(poolInterval);
  });

  // Expose /metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}, { name: 'metrics' });
