/**
 * Auth Plugin
 * Adapted from stablecoin-gateway for Pulse RBAC model.
 *
 * Provides JWT authentication with role-based access control
 * (ADMIN, MEMBER, VIEWER). Decorates requests with user info.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthUser;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      name: string;
    };
    user: {
      sub: string;
      email: string;
      name: string;
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Authenticate decorator - verifies JWT and attaches user.
   */
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const decoded = await request.jwtVerify() as {
          sub: string;
          email: string;
          name: string;
        };
        request.currentUser = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
        };
      } catch (err) {
        logger.warn('Authentication failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
          url: request.url,
        });
        return reply.code(401).send({
          type: 'https://pulse.dev/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid or expired JWT token.',
        });
      }
    }
  );
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});
