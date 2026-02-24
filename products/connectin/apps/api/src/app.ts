import Fastify, { FastifyInstance } from 'fastify';
import { loadConfig } from './config';

// Plugins
import prismaPlugin from './plugins/prisma';
import corsPlugin from './plugins/cors';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import errorHandlerPlugin from './plugins/error-handler';
import rateLimiterPlugin from './plugins/rate-limiter';
import requestIdPlugin from './plugins/request-id';
import accessLogPlugin from './plugins/access-log';
import swaggerPlugin from './plugins/swagger';
import csrfPlugin from './plugins/csrf';
import metricsPlugin from './plugins/metrics';
import sentryPlugin from './plugins/sentry';
import websocketPlugin from './plugins/websocket';

// Services
import { AuthService } from './modules/auth/auth.service';

// Routes
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profile/profile.routes';
import connectionRoutes from './modules/connection/connection.routes';
import feedRoutes from './modules/feed/feed.routes';
import consentRoutes from './modules/consent/consent.routes';
import jobsRoutes from './modules/jobs/jobs.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import searchRoutes from './modules/search/search.routes';
import presenceRoutes from './modules/presence/presence.routes';
import { blockRoutes, reportRoutes } from './modules/block/block.routes';
import followRoutes from './modules/follow/follow.routes';
import endorsementRoutes from './modules/endorsement/endorsement.routes';
import hashtagRoutes from './modules/hashtag/hashtag.routes';
import mediaRoutes from './modules/media/media.routes';
import bookmarkRoutes from './modules/bookmark/bookmark.routes';
import pollRoutes from './modules/poll/poll.routes';
import certificationRoutes from './modules/certification/certification.routes';
import recommendationRoutes from './modules/recommendation/recommendation.routes';
import jobAlertRoutes from './modules/job-alert/job-alert.routes';
import groupMessagingRoutes from './modules/messaging/group-messaging.routes';
import advancedSearchRoutes from './modules/search/advanced-search.routes';
import salaryInsightsRoutes from './modules/salary/salary-insights.routes';
import organizationRoutes from './modules/organization/organization.routes';
import groupRoutes from './modules/group/group.routes';
import eventRoutes from './modules/event/event.routes';
import articleRoutes from './modules/article/article.routes';
import aiRoutes from './modules/ai/ai.routes';

export interface BuildAppOptions {
  skipRateLimit?: boolean;
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  loadConfig();

  /* istanbul ignore next */
  const isTest = process.env.NODE_ENV === 'test';
  const isProd = process.env.NODE_ENV === 'production';
  const app = Fastify({
    bodyLimit: 1_048_576, // 1 MB — explicit limit prevents unbounded payloads
    logger: isTest
      ? false
      : isProd
        ? {
            // pino outputs structured JSON by default — no transport needed
            level: 'info',
          }
        : {
            // Development: human-readable output via pino-pretty if available,
            // otherwise fall back to plain JSON at the configured level.
            level: process.env.LOG_LEVEL ?? 'info',
          },
  });

  // Core plugins
  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  await app.register(redisPlugin); // Must register before authPlugin (blacklist check)
  await app.register(authPlugin);

  /* istanbul ignore next */
  if (!options.skipRateLimit) {
    await app.register(rateLimiterPlugin);
  }

  await app.register(websocketPlugin);
  await app.register(
    (await import('@fastify/multipart')).default,
    { limits: { fileSize: 10 * 1024 * 1024 } } // 10 MB
  );
  await app.register(csrfPlugin);

  /* istanbul ignore next */
  if (process.env.NODE_ENV !== 'test') {
    await app.register(accessLogPlugin);
    await app.register(swaggerPlugin);
    await app.register(metricsPlugin);
    await app.register(sentryPlugin);
  }

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, {
    prefix: '/api/v1/auth',
  });
  await app.register(profileRoutes, {
    prefix: '/api/v1/profiles',
  });
  await app.register(connectionRoutes, {
    prefix: '/api/v1/connections',
  });
  await app.register(feedRoutes, {
    prefix: '/api/v1/feed',
  });
  await app.register(consentRoutes, {
    prefix: '/api/v1/consent',
  });
  await app.register(jobsRoutes, {
    prefix: '/api/v1/jobs',
  });
  await app.register(messagingRoutes, {
    prefix: '/api/v1/conversations',
  });
  await app.register(notificationsRoutes, {
    prefix: '/api/v1/notifications',
  });
  await app.register(searchRoutes, {
    prefix: '/api/v1/search',
  });
  await app.register(presenceRoutes, {
    prefix: '/api/v1/presence',
  });
  await app.register(blockRoutes, {
    prefix: '/api/v1/blocks',
  });
  await app.register(reportRoutes, {
    prefix: '/api/v1/reports',
  });
  await app.register(followRoutes, {
    prefix: '/api/v1/follows',
  });
  await app.register(endorsementRoutes, {
    prefix: '/api/v1/endorsements',
  });
  await app.register(hashtagRoutes, {
    prefix: '/api/v1/hashtags',
  });
  await app.register(mediaRoutes, {
    prefix: '/api/v1/media',
  });
  await app.register(bookmarkRoutes, {
    prefix: '/api/v1/bookmarks',
  });
  await app.register(pollRoutes, {
    prefix: '/api/v1/polls',
  });
  await app.register(certificationRoutes, {
    prefix: '/api/v1/certifications',
  });
  await app.register(recommendationRoutes, {
    prefix: '/api/v1/recommendations',
  });
  await app.register(jobAlertRoutes, {
    prefix: '/api/v1/job-alerts',
  });
  await app.register(groupMessagingRoutes, {
    prefix: '/api/v1/conversations/groups',
  });
  await app.register(advancedSearchRoutes, {
    prefix: '/api/v1/search/advanced',
  });
  await app.register(salaryInsightsRoutes, {
    prefix: '/api/v1/salary-insights',
  });
  await app.register(organizationRoutes, {
    prefix: '/api/v1/organizations',
  });
  await app.register(groupRoutes, {
    prefix: '/api/v1/groups',
  });
  await app.register(eventRoutes, {
    prefix: '/api/v1/events',
  });
  await app.register(articleRoutes, {
    prefix: '/api/v1/articles',
  });
  await app.register(aiRoutes, {
    prefix: '/api/v1/ai',
  });

  // Session cleanup — run hourly in non-test environments
  /* istanbul ignore next */
  if (!isTest) {
    let cleanupInterval: ReturnType<typeof setInterval>;

    app.addHook('onReady', async () => {
      const authService = new AuthService(app.prisma, app);
      cleanupInterval = setInterval(async () => {
        try {
          const count = await authService.cleanupExpiredSessions();
          if (count > 0) {
            app.log.info({ msg: 'session-cleanup', deleted: count });
          }
        } catch (err) {
          app.log.error({ msg: 'session-cleanup-error', error: err });
        }
      }, 60 * 60 * 1000); // 1 hour
    });

    app.addHook('onClose', async () => {
      if (cleanupInterval) clearInterval(cleanupInterval);
    });
  }

  return app;
}
