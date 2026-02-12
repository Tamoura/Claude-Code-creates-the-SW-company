import fp from 'fastify-plugin';
import crypto from 'crypto';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: bigint;
  }
}

const metrics = {
  requests: 0,
  errors: 0,
  latencies: [] as number[],
};

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export default fp(async (fastify: FastifyInstance) => {
  const internalApiKey = process.env.INTERNAL_API_KEY;

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.requestId = (request.headers['x-request-id'] as string) || crypto.randomUUID();
    request.startTime = process.hrtime.bigint();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Number(process.hrtime.bigint() - request.startTime) / 1e6;
    metrics.requests++;
    metrics.latencies.push(duration);
    if (metrics.latencies.length > 10000) metrics.latencies.shift();

    if (reply.statusCode >= 500) {
      metrics.errors++;
      logger.error('Request failed', {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(duration),
      });
    } else if (reply.statusCode >= 400) {
      logger.warn('Client error', {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(duration),
      });
    } else {
      logger.info('Request completed', {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(duration),
      });
    }

    reply.header('X-Request-ID', request.requestId);
  });

  fastify.get('/internal/metrics', async (request, reply) => {
    if (!internalApiKey) {
      return reply.status(404).send();
    }

    const authHeader = request.headers['authorization'];
    const providedKey = authHeader?.replace('Bearer ', '');

    if (!providedKey || !crypto.timingSafeEqual(
      Buffer.from(providedKey.padEnd(64)),
      Buffer.from(internalApiKey.padEnd(64)),
    )) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    return {
      totalRequests: metrics.requests,
      totalErrors: metrics.errors,
      errorRate: metrics.requests > 0 ? metrics.errors / metrics.requests : 0,
      latency: {
        p50: Math.round(percentile(metrics.latencies, 50)),
        p95: Math.round(percentile(metrics.latencies, 95)),
        p99: Math.round(percentile(metrics.latencies, 99)),
      },
    };
  });
}, { name: 'observability' });
