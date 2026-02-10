import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError } from '../lib/errors';
import { logger } from '../utils/logger';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Missing authorization header');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Invalid authorization format');
      }

      const decoded = await request.jwtVerify() as {
        sub: string;
        email: string;
      };

      if (!decoded.sub || typeof decoded.sub !== 'string') {
        throw new UnauthorizedError('Invalid token payload');
      }

      const parent = await fastify.prisma.parent.findUnique({
        where: { id: decoded.sub },
      });

      if (!parent) {
        throw new UnauthorizedError('User not found');
      }

      request.currentUser = parent;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Authentication error', error);
      throw new UnauthorizedError('Authentication failed');
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt', 'prisma'],
});
