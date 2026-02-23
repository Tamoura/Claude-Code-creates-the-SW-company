import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';

const sentryPlugin: FastifyPluginAsync = async (fastify) => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    fastify.log.info('Sentry DSN not configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Strip PII from error events
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
  });

  // Capture unhandled errors that reach the error handler
  fastify.addHook('onError', async (_request, _reply, error) => {
    Sentry.captureException(error);
  });

  fastify.addHook('onClose', async () => {
    await Sentry.close(2000);
  });

  fastify.log.info('Sentry error tracking initialized');
};

export default fp(sentryPlugin, { name: 'sentry' });
