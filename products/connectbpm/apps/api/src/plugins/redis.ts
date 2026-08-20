/**
 * Redis — cache and SOFT counters only.
 *
 * BINDING CONSTRAINT (FR-045, DEC-002 note, ADR-007):
 *   Redis must never hold a value that billing, evidence or execution
 *   correctness depends on. Meters, quotas that gate admission, timers and the
 *   outbox all live in PostgreSQL. If you are reaching for Redis to store
 *   something that must survive a flush, you are in the wrong store.
 *
 * Key convention (ADR-004 §5): `bpm:{tenantId}:...` — always tenant-prefixed.
 */
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { getConfig } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const { REDIS_URL } = getConfig();

  if (!REDIS_URL) {
    fastify.log.warn('REDIS_URL not set — running without cache');
    fastify.decorate('redis', null);
    return;
  }

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });

  redis.on('error', (error: Error) => {
    fastify.log.error({ msg: 'Redis error', name: error.name });
  });

  try {
    await redis.connect();
    fastify.log.info('Redis connected');
  } catch {
    // Redis is degradable by design — the API must still serve.
    fastify.log.warn('Redis unreachable at startup — continuing degraded');
  }

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
};

export default fp(redisPlugin, { name: 'redis-plugin' });
