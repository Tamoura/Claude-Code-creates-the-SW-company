import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export function getRedisOptions(): RedisOptions {
  const enableTls = process.env.REDIS_TLS === 'true';
  const rejectUnauthorized =
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false';
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    tls: enableTls
      ? { rejectUnauthorized }
      : undefined,
    password,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error) {
      logger.error('Redis connection error', err);
      return true;
    },
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn(
      'REDIS_URL not configured - Redis features disabled'
    );
    fastify.decorate('redis', null);
    return;
  }

  try {
    const options = getRedisOptions();
    const redis = new Redis(redisUrl, options);

    redis.on('error', (err) => {
      logger.error('Redis error', err);
    });

    try {
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis timeout')),
            5000
          )
        ),
      ]);
      logger.info('Redis connection established');
    } catch (err) {
      logger.error('Redis ping failed', err);
      await redis.quit();
      throw err;
    }

    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
      logger.info('Closing Redis connection');
      await redis.quit();
    });
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    fastify.decorate('redis', null);
  }
};

export default fp(redisPlugin, {
  name: 'redis',
});
