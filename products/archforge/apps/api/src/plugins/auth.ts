/**
 * Auth Plugin
 *
 * Dual authentication: JWT tokens + API keys.
 *
 * - JWT: For user sessions (browser/mobile), verified via @fastify/jwt
 * - API keys: For developer integrations, verified via HMAC-SHA256
 *   against the api_keys table
 *
 * Decorates requests with `currentUser` and optionally `apiKey`.
 * Provides `fastify.authenticate` decorator for route-level auth.
 */

import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../types/index.js';
import { hashApiKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const authPlugin: FastifyPluginAsync = async (fastify) => {
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
        const { userId: decodedUserId, jti } = decoded as { userId?: string; jti?: string };

        if (!decodedUserId || typeof decodedUserId !== 'string') {
          throw new AppError(401, 'unauthorized', 'Invalid token payload');
        }

        // Check JTI blacklist in Redis
        if (jti && fastify.redis) {
          try {
            const blacklisted = await fastify.redis.get(`blacklist:${jti}`);
            if (blacklisted) {
              throw new AppError(401, 'unauthorized', 'Token has been revoked');
            }
          } catch (err) {
            if (err instanceof AppError) throw err;
            logger.debug('Redis blacklist check failed, allowing token', {
              error: err instanceof Error ? err.message : 'unknown',
            });
          }
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: decodedUserId },
        });

        if (!user) {
          throw new AppError(401, 'unauthorized', 'User not found');
        }

        if (user.status !== 'active') {
          throw new AppError(403, 'account-suspended', 'Account is suspended or deactivated');
        }

        request.currentUser = user;
        return;
      } catch (jwtError) {
        if (jwtError instanceof AppError) {
          if (jwtError.code !== 'unauthorized') {
            throw jwtError;
          }
        }
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

      if (apiKey.user.status !== 'active') {
        throw new AppError(403, 'account-suspended', 'Account is suspended or deactivated');
      }

      // Update last used timestamp (fire-and-forget)
      fastify.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch((err) => {
        logger.debug('Failed to update API key lastUsedAt', {
          apiKeyId: apiKey.id,
          error: err instanceof Error ? err.message : 'unknown',
        });
      });

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
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
