import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

const rateLimiterPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    // Higher limit in dev/test to accommodate E2E test suites
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    }),
  });
};

export default fp(rateLimiterPlugin, { name: 'rate-limiter' });
