import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number }
  ): Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisLike;
  }
}

/**
 * In-memory fallback for dev/test when no REDIS_URL is set.
 * Stores values with expiry timestamps. Does NOT share state
 * across processes — unsuitable for production.
 */
function createMemoryStore(): RedisLike {
  const store = new Map<string, { value: string; expiry: number }>();

  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(
      key: string,
      value: string,
      options?: { EX?: number }
    ): Promise<void> {
      const ttlMs = (options?.EX ?? 900) * 1000;
      store.set(key, { value, expiry: Date.now() + ttlMs });
    },
  };
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !redisUrl) {
    throw new Error(
      'REDIS_URL is required in production. ' +
      'Set REDIS_URL environment variable to a Redis connection string.'
    );
  }

  if (redisUrl) {
    // Real Redis mode
    const { createClient } = await import('redis');
    const client = createClient({ url: redisUrl });

    client.on('error', (err) => {
      fastify.log.error({
        msg: 'Redis client error',
        error: err.message,
      });
    });

    await client.connect();

    const adapter: RedisLike = {
      async get(key: string): Promise<string | null> {
        return client.get(key);
      },
      async set(
        key: string,
        value: string,
        options?: { EX?: number }
      ): Promise<void> {
        if (options?.EX) {
          await client.set(key, value, { EX: options.EX });
        } else {
          await client.set(key, value);
        }
      },
    };

    fastify.decorate('redis', adapter);

    fastify.addHook('onClose', async () => {
      await client.quit();
    });

    fastify.log.info('Redis plugin connected to %s', redisUrl);
  } else {
    // In-memory fallback for dev/test
    fastify.decorate('redis', createMemoryStore());
    fastify.log.warn(
      'Redis plugin running in-memory mode (dev/test only).'
    );
  }
};

export default fp(redisPlugin, { name: 'redis' });
