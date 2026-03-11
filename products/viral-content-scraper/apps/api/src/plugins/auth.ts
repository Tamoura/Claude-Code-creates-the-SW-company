import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import { UnauthorizedError } from '../utils/errors';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string };
    user: { sub: string; email: string; role: string };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';

  await fastify.register(fjwt, {
    secret,
    sign: { expiresIn: '24h' },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  fastify.decorate('optionalAuth', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
    } catch {
      // Allow unauthenticated access
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});
