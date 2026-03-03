/**
 * plugins/observability.ts — Request logging and metrics
 *
 * Registration order: LAST (after all other plugins) per addendum convention.
 *
 * Features:
 * - Structured access logging with correlation IDs
 * - Request duration tracking
 * - In-memory metrics counters (reset on restart)
 * - GET /metrics endpoint (requires INTERNAL_API_KEY)
 * - PII-safe logging (no email, IP, or token values in logs)
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger.js';

interface Metrics {
  requests: { total: number; byStatus: Record<number, number> };
  errors: { total: number };
  performance: { totalDuration: number; requestCount: number; samples: number[] };
}

const startedAt = new Date().toISOString();
const metrics: Metrics = {
  requests: { total: 0, byStatus: {} },
  errors: { total: 0 },
  performance: { totalDuration: 0, requestCount: 0, samples: [] },
};

function trackMetrics(_request: FastifyRequest, reply: FastifyReply, durationMs: number): void {
  metrics.requests.total++;
  metrics.requests.byStatus[reply.statusCode] =
    (metrics.requests.byStatus[reply.statusCode] || 0) + 1;
  if (reply.statusCode >= 400) {
    metrics.errors.total++;
  }
  metrics.performance.totalDuration += durationMs;
  metrics.performance.requestCount++;
  metrics.performance.samples.push(durationMs);
  if (metrics.performance.samples.length > 1000) {
    metrics.performance.samples.shift();
  }
}

function calculatePercentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function timingSafeHeaderCheck(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const maxLen = Math.max(provided.length, expected.length);
  const aBuf = Buffer.alloc(maxLen, 0);
  const bBuf = Buffer.alloc(maxLen, 0);
  Buffer.from(provided).copy(aBuf);
  Buffer.from(expected).copy(bBuf);
  return provided.length === expected.length && timingSafeEqual(aBuf, bBuf);
}

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
  // Track request start time
  fastify.addHook('onRequest', async (req) => {
    req.startTime = Date.now();
    logger.debug('Incoming request', {
      request_id: req.id,
      method: req.method,
      url: req.url,
    });
  });

  // Log response and track metrics
  fastify.addHook('onResponse', async (request, reply) => {
    const durationMs = Date.now() - (request.startTime ?? Date.now());
    trackMetrics(request, reply, durationMs);

    const level =
      reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';

    const logData = {
      request_id: request.id,
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      duration_ms: durationMs,
      user_id: request.currentUser?.id,
    };

    if (level === 'error') {
      logger.error('Request completed with server error', undefined, logData);
    } else if (level === 'warn') {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  // GET /metrics — internal endpoint, requires INTERNAL_API_KEY
  fastify.get('/metrics', async (request, reply) => {
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      return reply.code(503).send({
        type: 'https://api.ai-fluency.connectsw.com/errors/not-configured',
        title: 'not-configured',
        status: 503,
        detail: 'Metrics endpoint not configured — set INTERNAL_API_KEY',
      });
    }

    const providedKey = request.headers['x-internal-api-key'] as string | undefined;
    if (!timingSafeHeaderCheck(providedKey, expectedKey)) {
      return reply.code(401).send({
        type: 'https://api.ai-fluency.connectsw.com/errors/unauthorized',
        title: 'unauthorized',
        status: 401,
        detail: 'Invalid or missing X-Internal-Api-Key header',
      });
    }

    const avg =
      metrics.performance.requestCount > 0
        ? metrics.performance.totalDuration / metrics.performance.requestCount
        : 0;

    return reply.send({
      started_at: startedAt,
      requests_total: metrics.requests.total,
      errors_total: metrics.errors.total,
      by_status: metrics.requests.byStatus,
      performance: {
        avg_ms: Math.round(avg),
        p50_ms: Math.round(calculatePercentile(metrics.performance.samples, 50)),
        p95_ms: Math.round(calculatePercentile(metrics.performance.samples, 95)),
        p99_ms: Math.round(calculatePercentile(metrics.performance.samples, 99)),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Periodic metrics flush to log aggregation
  const flushInterval = setInterval(() => {
    if (metrics.requests.total === 0) return;
    logger.info('metrics_snapshot', {
      requests_total: metrics.requests.total,
      errors_total: metrics.errors.total,
      p99_ms: Math.round(calculatePercentile(metrics.performance.samples, 99)),
      started_at: startedAt,
    });
  }, 60_000);

  if (flushInterval.unref) flushInterval.unref();

  fastify.addHook('onClose', async () => {
    clearInterval(flushInterval);
  });
};

export default fp(observabilityPlugin, {
  name: 'observability',
});
