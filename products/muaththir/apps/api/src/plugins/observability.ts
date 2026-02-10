import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

interface Metrics {
  requests: {
    total: number;
    byStatus: Record<number, number>;
    byMethod: Record<string, number>;
  };
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byStatus: {},
    byMethod: {},
  },
};

function trackMetrics(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  metrics.requests.total++;
  metrics.requests.byStatus[reply.statusCode] =
    (metrics.requests.byStatus[reply.statusCode] || 0) + 1;
  metrics.requests.byMethod[request.method] =
    (metrics.requests.byMethod[request.method] || 0) + 1;
}

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    trackMetrics(request, reply);

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

    if (request.currentUser) {
      logData.user_id = request.currentUser.id;
    }

    if (level === 'error') {
      logger.error('Request completed with error', undefined, logData);
    } else if (level === 'warn') {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
};

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export default fp(observabilityPlugin, {
  name: 'observability',
});
