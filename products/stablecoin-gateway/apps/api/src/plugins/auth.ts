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
        const user = await fastify.prisma.user.findUnique({
          where: { id: (decoded as any).userId },
        });

        if (!user) {
          throw new AppError(401, 'unauthorized', 'User not found');
        }

        request.currentUser = user;
        return;
      } catch (jwtError) {
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

      // Update last used timestamp
      await fastify.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
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

  // Optional authentication (doesn't fail if not authenticated)
  fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
    try {
      await fastify.authenticate(request);
    } catch (error) {
      // Silently fail for optional auth
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['jwt', 'prisma'],
});

// Type augmentation
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
  }
}
