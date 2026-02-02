/**
 * Observability Plugin
 *
 * Provides comprehensive observability for production monitoring:
 * - Request/response logging with correlation IDs
 * - Performance tracking (request duration)
 * - Error rate monitoring
 * - Metrics collection
 * - Sensitive data sanitization
 *
 * Features:
 * - Structured logging (JSON in production)
 * - Request correlation via X-Request-ID
 * - Automatic performance timing
 * - Error tracking with stack traces
 * - PII sanitization (passwords, tokens, keys)
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Metrics storage (in-memory for simplicity, can be replaced with Prometheus/StatsD)
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
    p50: number[];
    p95: number[];
    p99: number[];
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
    p50: [],
    p95: [],
    p99: [],
  },
};

/**
 * Track request metrics
 */
function trackMetrics(request: FastifyRequest, reply: FastifyReply, duration: number): void {
  // Update request counts
  metrics.requests.total++;
  metrics.requests.byStatus[reply.statusCode] =
    (metrics.requests.byStatus[reply.statusCode] || 0) + 1;
  metrics.requests.byMethod[request.method] =
    (metrics.requests.byMethod[request.method] || 0) + 1;

  // Track errors (4xx and 5xx)
  if (reply.statusCode >= 400) {
    metrics.errors.total++;
    const errorType = reply.statusCode >= 500 ? '5xx' : '4xx';
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
  }

  // Track performance
  metrics.performance.totalDuration += duration;
  metrics.performance.requestCount++;

  // Store duration for percentile calculation
  metrics.performance.p99.push(duration);

  // Keep only last 1000 durations for percentile calculation
  if (metrics.performance.p99.length > 1000) {
    metrics.performance.p99.shift();
  }
}

/**
 * Calculate percentiles from sorted array
 */
function calculatePercentile(arr: number[], percentile: number): number {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
  // Request logging hook
  fastify.addHook('onRequest', async (request, _reply) => {
    // Track request start time
    request.startTime = Date.now();

    // Log incoming request (debug level to avoid spam)
    logger.debug('Incoming request', {
      request_id: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      user_agent: request.headers['user-agent'],
    });
  });

  // Response logging hook
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());

    // Track metrics
    trackMetrics(request, reply, duration);

    // Determine log level based on status code
    const statusCode = reply.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Log response
    const logData: any = {
      request_id: request.id,
      method: request.method,
      url: request.url,
      status: statusCode,
      duration_ms: duration,
      ip: request.ip,
    };

    // Add user context if authenticated
    if (request.currentUser) {
      logData.user_id = request.currentUser.id;
    }

    // Log based on level
    if (level === 'error') {
      logger.error('Request completed with error', undefined, logData);
    } else if (level === 'warn') {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  // Error logging hook
  fastify.setErrorHandler(async (error, request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());

    logger.error('Request error', error, {
      request_id: request.id,
      method: request.method,
      url: request.url,
      duration_ms: duration,
      status: reply.statusCode || 500,
      user_id: request.currentUser?.id,
      ip: request.ip,
    });

    // Re-throw to let Fastify handle it
    throw error;
  });

  // Metrics endpoint (internal only - requires INTERNAL_API_KEY authentication)
  fastify.get('/internal/metrics', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const expectedKey = process.env.INTERNAL_API_KEY;

    // INTERNAL_API_KEY must be configured to access metrics
    if (!expectedKey) {
      logger.error('INTERNAL_API_KEY not configured - metrics endpoint unavailable');
      return reply.code(500).send({ error: 'Metrics endpoint not configured' });
    }

    // Timing-safe comparison to prevent timing side-channel attacks
    const expectedValue = `Bearer ${expectedKey}`;
    const suppliedValue = authHeader || '';
    const isValid =
      suppliedValue.length === expectedValue.length &&
      crypto.timingSafeEqual(
        Buffer.from(suppliedValue),
        Buffer.from(expectedValue),
      );

    if (!isValid) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Calculate percentiles
    const p50 = calculatePercentile(metrics.performance.p99, 50);
    const p95 = calculatePercentile(metrics.performance.p99, 95);
    const p99 = calculatePercentile(metrics.performance.p99, 99);

    const avgDuration =
      metrics.performance.requestCount > 0
        ? metrics.performance.totalDuration / metrics.performance.requestCount
        : 0;

    return reply.send({
      requests: {
        total: metrics.requests.total,
        by_status: metrics.requests.byStatus,
        by_method: metrics.requests.byMethod,
      },
      errors: {
        total: metrics.errors.total,
        error_rate:
          metrics.requests.total > 0
            ? ((metrics.errors.total / metrics.requests.total) * 100).toFixed(2) + '%'
            : '0%',
        by_type: metrics.errors.byType,
      },
      performance: {
        avg_duration_ms: Math.round(avgDuration),
        p50_ms: Math.round(p50),
        p95_ms: Math.round(p95),
        p99_ms: Math.round(p99),
      },
      timestamp: new Date().toISOString(),
    });
  });
};

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export default fp(observabilityPlugin, {
  name: 'observability',
});
