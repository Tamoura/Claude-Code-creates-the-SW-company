import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../types/index.js';
import { hashApiKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorator for authentication check
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new AppError(401, 'unauthorized', 'Missing authorization header');
      }

      // Check if it's a Bearer token
      if (!authHeader.startsWith('Bearer ')) {
        throw new AppError(401, 'unauthorized', 'Invalid authorization format');
      }

      const token = authHeader.substring(7);

      // Try JWT first (for user sessions)
      try {
        const decoded = await request.jwtVerify();

        // SECURITY: Check JTI blacklist for revoked access tokens.
        // On logout, the access token's JTI is stored in Redis so
        // it is rejected for the remainder of its 15-minute lifetime.
        // If Redis is unavailable, skip the check (graceful degradation).
        const { jti, userId: decodedUserId } = decoded as { jti?: string; userId?: string };
        if (jti && fastify.redis) {
          try {
            const revoked = await fastify.redis.get(`revoked_jti:${jti}`);
            if (revoked) {
              throw new AppError(401, 'token-revoked', 'Token has been revoked');
            }
          } catch (redisError) {
            if (redisError instanceof AppError) {
              throw redisError;
            }
            // Redis error -- degrade gracefully, allow the request
            logger.warn('Redis unavailable during JTI check, skipping', {
              jti,
              error: redisError instanceof Error ? redisError.message : 'unknown',
            });
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
        // If it's a token-revoked error, re-throw immediately
        if (jwtError instanceof AppError && jwtError.code === 'token-revoked') {
          throw jwtError;
        }
        // If JWT fails for other reasons, try API key
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

      // Update last used timestamp (fire-and-forget to avoid blocking the request)
      fastify.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch((err) => logger.debug('Failed to update API key lastUsedAt', { apiKeyId: apiKey.id, error: err instanceof Error ? err.message : 'unknown' }));

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

  // Optional authentication (doesn't fail if not authenticated)
  fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
    try {
      await fastify.authenticate(request);
    } catch (error) {
      // Silently fail for optional auth
    }
  });

  // Permission enforcement decorator
  fastify.decorate('requirePermission', (permission: 'read' | 'write' | 'refund') => {
    return async (request: FastifyRequest) => {
      // If authenticated via JWT (user session), allow all permissions
      if (!request.apiKey) {
        return; // JWT users have full permissions
      }

      // If authenticated via API key, check permissions
      const permissions = request.apiKey.permissions as { read: boolean; write: boolean; refund: boolean };

      if (!permissions[permission]) {
        throw new AppError(
          403,
          'insufficient-permissions',
          `This API key does not have '${permission}' permission`
        );
      }
    };
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
