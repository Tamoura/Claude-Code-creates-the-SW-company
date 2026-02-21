import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { getConfig } from '../config';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    },
  });

  await fastify.register(cookie, {
    secret: config.JWT_REFRESH_SECRET,
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest) => {
      try {
        await request.jwtVerify();
      } catch {
        throw new UnauthorizedError('Invalid or expired token');
      }
    }
  );

  fastify.decorate(
    'requireRole',
    (roles: string[]) =>
      async (request: FastifyRequest) => {
        await (fastify as any).authenticate(request);
        const user = request.user;
        if (!roles.includes(user.role)) {
          throw new ForbiddenError('Insufficient permissions');
        }
      }
  );
};

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireRole: (
      roles: string[]
    ) => (request: FastifyRequest) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: [],
});
