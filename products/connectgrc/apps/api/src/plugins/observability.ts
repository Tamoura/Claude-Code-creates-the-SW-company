import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
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
  requests: {
    total: 0,
    byStatus: {},
    byMethod: {},
  },
  errors: {
    total: 0,
    byType: {},
  },
  performance: {
    totalDuration: 0,
    requestCount: 0,
    durations: [],
  },
};

function trackMetrics(request: FastifyRequest, reply: FastifyReply, duration: number): void {
  metrics.requests.total++;
  metrics.requests.byStatus[reply.statusCode] =
    (metrics.requests.byStatus[reply.statusCode] || 0) + 1;
  metrics.requests.byMethod[request.method] =
    (metrics.requests.byMethod[request.method] || 0) + 1;

  if (reply.statusCode >= 400) {
    metrics.errors.total++;
    const errorType = reply.statusCode >= 500 ? '5xx' : '4xx';
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
  }

  metrics.performance.totalDuration += duration;
  metrics.performance.requestCount++;
  metrics.performance.durations.push(duration);

  if (metrics.performance.durations.length > 1000) {
    metrics.performance.durations.shift();
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
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
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    const logData: Record<string, unknown> = {
      request_id: request.id,
      method: request.method,
      url: request.url,
      status: statusCode,
      duration_ms: duration,
      ip: request.ip,
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

export default fp(observabilityPlugin, {
  name: 'observability',
});
