import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../lib/errors';

export interface JwtPayload {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
  }
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('userId', '');
  fastify.decorateRequest('userEmail', '');

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, _reply: FastifyReply) {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(
          token,
          config.jwtSecret
        ) as JwtPayload;
        request.userId = decoded.userId;
        request.userEmail = decoded.email;
      } catch {
        throw new UnauthorizedError('Invalid or expired token');
      }
    }
  );
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});
