import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hashApiKey } from '../utils/crypto';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface ApiKeyAuth {
  tenantId: string;
  permissions: string;
  keyId: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: string };
    user: { id: string; email: string; role: string };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyAuth?: ApiKeyAuth;
    tenantId?: string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: { expiresIn: '1h' },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      request.user = request.user as AuthUser;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  fastify.decorate('authenticateApiKey', async function (request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new UnauthorizedError('API key required (X-API-Key header)');
    }

    const keyHash = hashApiKey(apiKey);

    const dbKey = await fastify.prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      include: { tenant: true },
    });

    if (!dbKey) {
      throw new UnauthorizedError('Invalid API key');
    }

    if (dbKey.tenant.status !== 'active') {
      throw new ForbiddenError('Tenant suspended');
    }

    request.apiKeyAuth = {
      tenantId: dbKey.tenantId,
      permissions: dbKey.permissions,
      keyId: dbKey.id,
    };
    request.tenantId = dbKey.tenantId;

    // Update last used (fire and forget)
    fastify.prisma.apiKey.update({
      where: { id: dbKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});
  });

  fastify.decorate('requirePermission', function (permission: 'read' | 'read_write') {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.apiKeyAuth) {
        throw new UnauthorizedError('API key authentication required');
      }
      if (permission === 'read_write' && request.apiKeyAuth.permissions === 'read') {
        throw new ForbiddenError('Insufficient permissions: write access required');
      }
    };
  });

  fastify.decorate('optionalAuth', async function (request: FastifyRequest, reply: FastifyReply) {
    // Try JWT first, then API key - don't throw if neither
    try {
      await request.jwtVerify();
      request.user = request.user as AuthUser;
      return;
    } catch {
      // Not JWT auth, try API key
    }

    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const keyHash = hashApiKey(apiKey);
      const dbKey = await fastify.prisma.apiKey.findFirst({
        where: { keyHash, revokedAt: null },
        include: { tenant: true },
      });
      if (dbKey && dbKey.tenant.status === 'active') {
        request.apiKeyAuth = {
          tenantId: dbKey.tenantId,
          permissions: dbKey.permissions,
          keyId: dbKey.id,
        };
        request.tenantId = dbKey.tenantId;
      }
    }
  });
}, { name: 'auth', dependencies: ['prisma'] });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (permission: 'read' | 'read_write') => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
