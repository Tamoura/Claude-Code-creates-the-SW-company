import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Redis plugin stub — token blacklisting architecture.
 *
 * PRODUCTION SETUP REQUIRED:
 *   1. Install the redis package:  npm install redis
 *   2. Set REDIS_URL in environment (e.g. redis://localhost:6379)
 *   3. Replace this stub with the real implementation below.
 *
 * REAL IMPLEMENTATION (uncomment when redis package is installed):
 *
 *   import { createClient } from 'redis';
 *
 *   declare module 'fastify' {
 *     interface FastifyInstance {
 *       redis: ReturnType<typeof createClient>;
 *     }
 *   }
 *
 *   const redisPlugin: FastifyPluginAsync = async (fastify) => {
 *     const client = createClient({
 *       url: process.env.REDIS_URL || 'redis://localhost:6379',
 *     });
 *     client.on('error', (err) => {
 *       fastify.log.error({ msg: 'Redis error', error: err.message });
 *     });
 *     await client.connect();
 *     fastify.decorate('redis', client);
 *     fastify.addHook('onClose', async () => {
 *       await client.quit();
 *     });
 *   };
 *
 * TOKEN BLACKLISTING USAGE:
 *   // In logout handler — blacklist the access token's jti:
 *   const jti = request.user.jti;
 *   const ttl = 900; // 15 minutes (access token max lifetime)
 *   await fastify.redis.set(`blacklist:${jti}`, '1', { EX: ttl });
 *
 *   // In auth plugin authenticate decorator — check blacklist:
 *   await request.jwtVerify();
 *   const decoded = request.user as { jti?: string };
 *   if (decoded.jti) {
 *     const revoked = await fastify.redis.get(`blacklist:${decoded.jti}`);
 *     if (revoked) throw new UnauthorizedError('Token has been revoked');
 *   }
 */

// In-memory blacklist used when Redis is not available.
// NOTE: This does NOT persist across restarts or share state between
// multiple API instances. Use the real Redis implementation for production.
const memoryBlacklist = new Map<string, number>();

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  // Stub interface matching the subset of the redis client API used for
  // blacklisting. Only `get` and `set` with EX option are implemented.
  const stub = {
    async get(key: string): Promise<string | null> {
      const expiry = memoryBlacklist.get(key);
      if (expiry === undefined) return null;
      if (Date.now() > expiry) {
        memoryBlacklist.delete(key);
        return null;
      }
      return '1';
    },
    async set(
      key: string,
      _value: string,
      options?: { EX?: number }
    ): Promise<void> {
      const ttlMs = (options?.EX ?? 900) * 1000;
      memoryBlacklist.set(key, Date.now() + ttlMs);
    },
  };

  fastify.decorate('redis', stub);

  fastify.log.warn(
    'Redis plugin running in STUB (in-memory) mode. ' +
    'Install the `redis` package and set REDIS_URL for production use.'
  );
};

declare module 'fastify' {
  interface FastifyInstance {
    redis: {
      get(key: string): Promise<string | null>;
      set(key: string, value: string, options?: { EX?: number }): Promise<void>;
    };
  }
}

export default fp(redisPlugin, { name: 'redis' });
