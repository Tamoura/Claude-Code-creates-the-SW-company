import pino from 'pino';

/**
 * Process-level logger. Request logging is handled by Fastify's own logger;
 * this one is for lifecycle events outside the request scope.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
    censor: '[redacted]',
  },
});
