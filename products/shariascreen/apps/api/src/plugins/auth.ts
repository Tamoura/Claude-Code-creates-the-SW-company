import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../lib/errors';
import { hashApiKey } from '../utils/crypto';
import { logger } from '../utils/logger';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader) {
          throw new AppError(
            'Missing authorization header',
            401,
            'UNAUTHORIZED'
          );
        }

        if (!authHeader.startsWith('Bearer ')) {
          throw new AppError(
            'Invalid authorization format',
            401,
            'UNAUTHORIZED'
          );
        }

        const token = authHeader.substring(7);

        // Try JWT first (for user sessions)
        try {
          const decoded = await request.jwtVerify();
          const { userId: decodedUserId } = decoded as {
            userId?: string;
          };

          if (
            !decodedUserId ||
            typeof decodedUserId !== 'string'
          ) {
            throw new AppError(
              'Invalid token payload',
              401,
              'UNAUTHORIZED'
            );
          }

          const user = await fastify.prisma.user.findUnique({
            where: { id: decodedUserId },
          });

          if (!user) {
            throw new AppError(
              'User not found',
              401,
              'UNAUTHORIZED'
            );
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
          throw new AppError(
            'Invalid API key',
            401,
            'UNAUTHORIZED'
          );
        }

        // Update last used (fire-and-forget)
        fastify.prisma.apiKey
          .update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          })
          .catch((err) =>
            logger.debug('Failed to update API key lastUsedAt', {
              apiKeyId: apiKey.id,
              error:
                err instanceof Error ? err.message : 'unknown',
            })
          );

        request.currentUser = apiKey.user;
        request.apiKey = apiKey;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Authentication error', error);
        throw new AppError(
          'Authentication failed',
          401,
          'UNAUTHORIZED'
        );
      }
    }
  );

  fastify.decorate(
    'optionalAuth',
    async (request: FastifyRequest) => {
      try {
        await fastify.authenticate(request);
      } catch {
        // Silently fail for optional auth
      }
    }
  );

  fastify.decorate(
    'requirePermission',
    (permission: 'read' | 'write') => {
      return async (request: FastifyRequest) => {
        if (!request.apiKey) {
          return; // JWT users have full permissions
        }

        const permissions = request.apiKey.permissions as {
          read: boolean;
          write: boolean;
        };

        if (!permissions[permission]) {
          throw new AppError(
            `This API key does not have '${permission}' permission`,
            403,
            'FORBIDDEN'
          );
        }
      };
    }
  );
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
