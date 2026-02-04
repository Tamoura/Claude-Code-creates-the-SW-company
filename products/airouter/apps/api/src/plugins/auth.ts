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

      // Try JWT first
      try {
        const decoded = await request.jwtVerify();
        const { userId: decodedUserId } = decoded as { userId?: string };

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
        if (jwtError instanceof AppError) {
          throw jwtError;
        }
        // JWT failed, try API key
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

      // Update last used (fire-and-forget)
      fastify.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch((err) => logger.debug('Failed to update API key lastUsedAt', {
        apiKeyId: apiKey.id,
        error: err instanceof Error ? err.message : 'unknown'
      }));

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
    } catch (_error) {
      // Silently fail for optional auth
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
