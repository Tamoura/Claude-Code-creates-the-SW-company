import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { hashApiKey, logger } from '@connectsw/shared';
import { AppError, AuthPluginOptions } from '../types.js';

// Circuit breaker: track Redis health for token revocation checks.
// SECURITY: Fail closed -- if Redis is unavailable, reject all JWT
// requests immediately with 503 rather than silently accepting
// potentially-revoked tokens.
let redisFailedSince: number | null = null;

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, opts) => {
  const permissions = opts.permissions ?? ['read', 'write'];

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new AppError(401, 'unauthorized', 'Missing authorization header');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new AppError(401, 'unauthorized', 'Invalid authorization format');
      }

      const token = authHeader.substring(7);

      // Try JWT first (for user sessions)
      try {
        const decoded = await request.jwtVerify();

        // Check JTI blacklist for revoked access tokens
        const { jti, userId: decodedUserId } = decoded as { jti?: string; userId?: string };
        if (jti && fastify.redis) {
          try {
            const revoked = await fastify.redis.get(`revoked_jti:${jti}`);
            if (revoked) {
              throw new AppError(401, 'token-revoked', 'Token has been revoked');
            }
            redisFailedSince = null;
          } catch (redisError) {
            if (redisError instanceof AppError) {
              throw redisError;
            }
            // Fail closed when Redis unavailable
            if (redisFailedSince === null) {
              redisFailedSince = Date.now();
            }
            logger.error('Redis unavailable during JTI check, rejecting request (fail closed)', {
              jti,
              redisFailedSince: new Date(redisFailedSince).toISOString(),
              error: redisError instanceof Error ? redisError.message : 'unknown',
            });
            throw new AppError(503, 'service-unavailable', 'Service temporarily unavailable');
          }
        }

        if (!decodedUserId || typeof decodedUserId !== 'string') {
          throw new AppError(401, 'unauthorized', 'Invalid token payload');
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: decodedUserId },
        });

        if (!user) {
          throw new AppError(401, 'unauthorized', 'User not found');
        }

        request.currentUser = user;
        return;
      } catch (jwtError) {
        if (
          jwtError instanceof AppError &&
          (jwtError.code === 'token-revoked' || jwtError.code === 'service-unavailable')
        ) {
          throw jwtError;
        }
        // If JWT fails, try API key
      }

      // Try API key authentication
      const keyHash = hashApiKey(token);
      const apiKey = await fastify.prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });

      if (!apiKey) {
        throw new AppError(401, 'unauthorized', 'Invalid API key');
      }

      // Update last used timestamp (fire-and-forget)
      fastify.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch((err: Error) => logger.debug('Failed to update API key lastUsedAt', { apiKeyId: apiKey.id, error: err.message }));

      request.currentUser = apiKey.user;
      request.apiKey = apiKey;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Authentication error', error);
      throw new AppError(401, 'unauthorized', 'Authentication failed');
    }
  });

  fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
    try {
      await fastify.authenticate(request);
    } catch {
      // Silently fail for optional auth
    }
  });

  fastify.decorate('requirePermission', (permission: string) => {
    if (!permissions.includes(permission)) {
      logger.warn(`Permission '${permission}' not in configured permissions: [${permissions.join(', ')}]`);
    }
    return async (request: FastifyRequest) => {
      if (!request.apiKey) {
        return; // JWT users have full permissions
      }

      const keyPermissions = request.apiKey.permissions as Record<string, boolean>;

      if (!keyPermissions[permission]) {
        throw new AppError(
          403,
          'insufficient-permissions',
          `This API key does not have '${permission}' permission`
        );
      }
    };
  });

  fastify.decorate('requireAdmin', async (request: FastifyRequest) => {
    if (!request.currentUser) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }

    if (request.currentUser.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Admin access required');
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
