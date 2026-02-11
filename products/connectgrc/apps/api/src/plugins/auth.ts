import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { hashApiKey } from '../utils/crypto';
import { logger } from '../utils/logger';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
    requireRole: (role: string) => (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    currentUser?: {
      id: string;
      email: string;
      role: string;
      name: string | null;
    };
    apiKey?: {
      id: string;
      permissions: unknown;
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization format');
    }

    const token = authHeader.substring(7);

    // Try JWT first
    try {
      const decoded = await request.jwtVerify() as {
        userId: string;
        email: string;
        role: string;
      };

      if (!decoded.userId || typeof decoded.userId !== 'string') {
        throw new UnauthorizedError('Invalid token payload');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      request.currentUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
      return;
    } catch (jwtError) {
      if (jwtError instanceof UnauthorizedError) {
        throw jwtError;
      }
      // JWT failed, try API key
    }

    // Try API key
    const keyHash = hashApiKey(token);
    const apiKey = await fastify.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Fire-and-forget update
    fastify.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch((err) =>
      logger.debug('Failed to update API key lastUsedAt', {
        apiKeyId: apiKey.id,
        error: err instanceof Error ? err.message : 'unknown',
      })
    );

    request.currentUser = {
      id: apiKey.user.id,
      email: apiKey.user.email,
      role: apiKey.user.role,
      name: apiKey.user.name,
    };
    request.apiKey = {
      id: apiKey.id,
      permissions: apiKey.permissions,
    };
  });

  fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
    try {
      await fastify.authenticate(request);
    } catch {
      // Silently fail for optional auth
    }
  });

  fastify.decorate('requireRole', (role: string) => {
    return async (request: FastifyRequest) => {
      if (!request.currentUser) {
        throw new UnauthorizedError('Authentication required');
      }
      if (request.currentUser.role !== role) {
        throw new ForbiddenError(`${role} access required`);
      }
    };
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
