import fp from 'fastify-plugin';
import {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface Metrics {
  requests: {
    total: number;
    byStatus: Record<number, number>;
    byMethod: Record<string, number>;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  performance: {
    totalDuration: number;
    requestCount: number;
    durations: number[];
  };
}

const metrics: Metrics = {
  requests: { total: 0, byStatus: {}, byMethod: {} },
  errors: { total: 0, byType: {} },
  performance: { totalDuration: 0, requestCount: 0, durations: [] },
};

function trackMetrics(
  request: FastifyRequest,
  reply: FastifyReply,
  duration: number
): void {
  metrics.requests.total++;
  metrics.requests.byStatus[reply.statusCode] =
    (metrics.requests.byStatus[reply.statusCode] || 0) + 1;
  metrics.requests.byMethod[request.method] =
    (metrics.requests.byMethod[request.method] || 0) + 1;

  if (reply.statusCode >= 400) {
    metrics.errors.total++;
    const errorType =
      reply.statusCode >= 500 ? '5xx' : '4xx';
    metrics.errors.byType[errorType] =
      (metrics.errors.byType[errorType] || 0) + 1;
  }

  metrics.performance.totalDuration += duration;
  metrics.performance.requestCount++;
  metrics.performance.durations.push(duration);
  if (metrics.performance.durations.length > 1000) {
    metrics.performance.durations.shift();
  }
}

function calculatePercentile(
  arr: number[],
  percentile: number
): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index =
    Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

const observabilityPlugin: FastifyPluginAsync = async (
  fastify
) => {
  fastify.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration =
      Date.now() - (request.startTime || Date.now());
    trackMetrics(request, reply, duration);

    const statusCode = reply.statusCode;
    const level =
      statusCode >= 500
        ? 'error'
        : statusCode >= 400
          ? 'warn'
          : 'info';

    const logData: Record<string, unknown> = {
      request_id: request.id,
      method: request.method,
      url: request.url,
      status: statusCode,
      duration_ms: duration,
    };

    if (level === 'error') {
      logger.error('Request completed with error', undefined, logData);
    } else if (level === 'warn') {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.debug('Request completed', logData);
    }
  });

  fastify.get('/internal/metrics', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      return reply
        .code(500)
        .send({ error: 'Metrics endpoint not configured' });
    }

    const expectedValue = `Bearer ${expectedKey}`;
    const suppliedValue = authHeader || '';
    const isValid =
      suppliedValue.length === expectedValue.length &&
      crypto.timingSafeEqual(
        Buffer.from(suppliedValue),
        Buffer.from(expectedValue)
      );

    if (!isValid) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const p50 = calculatePercentile(
      metrics.performance.durations,
      50
    );
    const p95 = calculatePercentile(
      metrics.performance.durations,
      95
    );
    const p99 = calculatePercentile(
      metrics.performance.durations,
      99
    );

    return reply.send({
      requests: metrics.requests,
      errors: metrics.errors,
      performance: {
        avg_duration_ms: Math.round(
          metrics.performance.requestCount > 0
            ? metrics.performance.totalDuration /
                metrics.performance.requestCount
            : 0
        ),
        p50_ms: Math.round(p50),
        p95_ms: Math.round(p95),
        p99_ms: Math.round(p99),
      },
      timestamp: new Date().toISOString(),
    });
  });
};

export default fp(observabilityPlugin, {
  name: 'observability',
});
