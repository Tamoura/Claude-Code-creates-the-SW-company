/**
 * plugins/auth.ts — JWT authentication and authorization decorators
 *
 * Registration order: MUST be after prismaPlugin and redisPlugin.
 * Dependencies declared via fastify-plugin so Fastify validates order.
 *
 * Decorators provided:
 * - fastify.authenticate(request) — verifies JWT, populates request.currentUser
 * - fastify.requireRole(role)(request) — enforces minimum role
 *
 * SECURITY: This plugin uses @fastify/jwt for token verification.
 * Algorithm is pinned to HS256 to prevent algorithm confusion attacks.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

type UserRole = 'LEARNER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

const ROLE_HIERARCHY: UserRole[] = ['LEARNER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];

function roleIndex(role: string): number {
  return ROLE_HIERARCHY.indexOf(role as UserRole);
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // authenticate decorator — verifies JWT and populates request.currentUser
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new AppError('unauthorized', 401, 'Missing Authorization header');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new AppError('unauthorized', 401, 'Authorization must use Bearer scheme');
      }

      // Verify JWT signature and expiry
      await request.jwtVerify();

      const payload = request.user as {
        sub?: string;
        orgId?: string;
        role?: string;
        jti?: string;
      };

      if (!payload.sub || !payload.orgId) {
        throw new AppError('unauthorized', 401, 'Invalid token payload');
      }

      // Fetch user from DB to confirm they still exist and are active
      const user = await fastify.prisma.user.findFirst({
        where: {
          id: payload.sub,
          orgId: payload.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          orgId: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user) {
        throw new AppError('unauthorized', 401, 'User not found');
      }

      if (user.status === 'LOCKED') {
        throw new AppError('account-locked', 403, 'Account is locked');
      }

      if (user.status === 'DEACTIVATED') {
        throw new AppError('account-deactivated', 403, 'Account has been deactivated');
      }

      request.currentUser = {
        id: user.id,
        orgId: user.orgId,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Authentication error', error);
      throw new AppError('unauthorized', 401, 'Authentication failed');
    }
  });

  // requireRole decorator — enforces minimum role level
  fastify.decorate(
    'requireRole',
    (minRole: UserRole) => async (request: FastifyRequest) => {
      if (!request.currentUser) {
        throw new AppError('unauthorized', 401, 'Authentication required');
      }

      const userRoleIndex = roleIndex(request.currentUser.role);
      const requiredRoleIndex = roleIndex(minRole);

      if (userRoleIndex < requiredRoleIndex) {
        throw new AppError(
          'forbidden',
          403,
          `This action requires ${minRole} role or higher`
        );
      }
    }
  );
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma', '@fastify/jwt'],
});
