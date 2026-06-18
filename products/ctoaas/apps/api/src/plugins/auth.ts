import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { getConfig } from '../config';
import { AppError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest
    ) => Promise<void>;
    requireRole: (
      roles: string[]
    ) => (request: FastifyRequest) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      algorithm: 'HS256',
      expiresIn: config.JWT_ACCESS_EXPIRY,
    },
    verify: {
      algorithms: ['HS256'],
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
        throw AppError.unauthorized(
          'Invalid or expired token'
        );
      }

      // Check token blacklist via Redis
      const jti = (request.user as { jti?: string }).jti;
      if (jti) {
        const revoked = await fastify.redis.get(
          `blacklist:${jti}`
        );
        if (revoked) {
          throw AppError.unauthorized(
            'Token has been revoked'
          );
        }
      }
    }
  );

  fastify.decorate(
    'requireRole',
    (roles: string[]) =>
      async (request: FastifyRequest) => {
        await (
          fastify as unknown as {
            authenticate: (
              request: FastifyRequest
            ) => Promise<void>;
          }
        ).authenticate(request);
        const user = request.user as { role?: string };
        if (!user.role || !roles.includes(user.role)) {
          throw AppError.forbidden(
            'Insufficient permissions'
          );
        }
      }
  );
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['redis-plugin'],
});
