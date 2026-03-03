/**
 * plugins/rate-limit.ts — Rate limiting via @fastify/rate-limit
 *
 * Registration order: after redisPlugin (uses Redis for distributed limiting).
 *
 * Health and metrics endpoints are exempted from rate limiting.
 * Authenticated endpoints use userId as key (not IP) to prevent shared-IP issues.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { logger } from '../utils/logger.js';
import { buildProblemDetails } from '../utils/errors.js';

const EXEMPT_PATHS = new Set(['/health', '/ready', '/metrics']);

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),

    // Exempt health, readiness, and metrics endpoints
    allowList: (request: FastifyRequest) => {
      const path = request.url.split('?')[0];
      return EXEMPT_PATHS.has(path);
    },

    // Key by userId for authenticated requests, IP for unauthenticated
    keyGenerator: (request: FastifyRequest) => {
      if (request.currentUser?.id) {
        return `user:${request.currentUser.id}`;
      }
      return `ip:${request.ip}`;
    },

    // RFC 7807 rate limit error response
    errorResponseBuilder: (_request, context) => {
      return buildProblemDetails(
        'rate-limit-exceeded',
        429,
        `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`
      );
    },

    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  logger.info('Rate limiting configured', {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
  });
};

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  dependencies: ['redis'],
});
