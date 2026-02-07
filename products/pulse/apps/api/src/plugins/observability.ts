/**
 * Observability Plugin
 * Adapted from stablecoin-gateway component registry.
 *
 * Provides request/response logging with correlation IDs,
 * performance tracking, and metrics collection.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

interface Metrics {
  requests: {
    total: number;
    byStatus: Record<number, number>;
    byMethod: Record<string, number>;
  };
  performance: {
    durations: number[];
  };
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byStatus: {},
    byMethod: {},
  },
  performance: {
    durations: [],
  },
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

  metrics.performance.durations.push(duration);
  if (metrics.performance.durations.length > 1000) {
    metrics.performance.durations.shift();
  }
}

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    request.startTime = Date.now();

    logger.debug('Incoming request', {
      request_id: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    trackMetrics(request, reply, duration);

    const statusCode = reply.statusCode;
    const level =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

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
      logger.info('Request completed', logData);
    }
  });
};

export default fp(observabilityPlugin, {
  name: 'observability',
});
