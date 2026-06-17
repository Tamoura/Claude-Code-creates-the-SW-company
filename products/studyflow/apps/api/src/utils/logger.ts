import pino from 'pino';

/**
 * Structured JSON logger. PII (email) and secrets are redacted.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'email',
      'token',
      'tokenHash',
      '*.password',
      '*.passwordHash',
      '*.email',
      'req.headers.cookie',
      'req.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
});
