import Fastify, { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';

import authPlugin from '../../src/plugins/auth';
import { AppError } from '../../src/utils/errors';
import healthRoutes from '../../src/modules/health/routes';
import authRoutes from '../../src/modules/auth/routes';
import tenantRoutes from '../../src/modules/tenants/routes';
import apiKeyRoutes from '../../src/modules/api-keys/routes';
import eventRoutes from '../../src/modules/events/routes';
import catalogRoutes from '../../src/modules/catalog/routes';
import widgetRoutes from '../../src/modules/widgets/routes';

// In-memory stores for test isolation
let admins: Map<string, any>;
let tenants: Map<string, any>;
let apiKeys: Map<string, any>;
let events: Map<string, any>;
let catalogItems: Map<string, any>;
let widgetConfigs: Map<string, any>;
let idCounter: number;

function resetStores() {
  admins = new Map();
  tenants = new Map();
  apiKeys = new Map();
  events = new Map();
  catalogItems = new Map();
  widgetConfigs = new Map();
  idCounter = 1;
}

function nextId() {
  return `test-id-${idCounter++}`;
}

function createMockPrisma() {
  return {
    $queryRaw: async () => [{ result: 1 }],
    $transaction: async (ops: any[] | ((prisma: any) => Promise<any>)) => {
      if (typeof ops === 'function') {
        return await ops(createMockPrisma());
      }
      return Promise.all(ops);
    },
    admin: {
      findUnique: async (args: any) => {
        if (args.where.email) {
          for (const admin of admins.values()) {
            if (admin.email === args.where.email) return admin;
          }
        }
        if (args.where.id) return admins.get(args.where.id) || null;
        return null;
      },
      create: async (args: any) => {
        const id = nextId();
        const admin = { id, ...args.data, role: 'admin', createdAt: new Date(), updatedAt: new Date() };
        admins.set(id, admin);
        return admin;
      },
    },
    tenant: {
      findMany: async (args: any) => {
        const results: any[] = [];
        for (const t of tenants.values()) {
          let match = true;
          if (args.where?.ownerId && t.ownerId !== args.where.ownerId) match = false;
          if (args.where?.status && t.status !== args.where.status) match = false;
          if (match) results.push(t);
        }
        const skip = args.skip || 0;
        const take = args.take || 20;
        return results.slice(skip, skip + take);
      },
      findFirst: async (args: any) => {
        for (const t of tenants.values()) {
          let match = true;
          if (args.where?.id && t.id !== args.where.id) match = false;
          if (args.where?.ownerId && t.ownerId !== args.where.ownerId) match = false;
          if (match) return t;
        }
        return null;
      },
      count: async (args: any) => {
        let count = 0;
        for (const t of tenants.values()) {
          let match = true;
          if (args.where?.ownerId && t.ownerId !== args.where.ownerId) match = false;
          if (args.where?.status && t.status !== args.where.status) match = false;
          if (match) count++;
        }
        return count;
      },
      create: async (args: any) => {
        const id = nextId();
        const tenant = { id, ...args.data, status: 'active', config: args.data.config || {}, createdAt: new Date(), updatedAt: new Date() };
        tenants.set(id, tenant);
        return tenant;
      },
      update: async (args: any) => {
        const t = tenants.get(args.where.id);
        if (!t) return null;
        Object.assign(t, args.data, { updatedAt: new Date() });
        return t;
      },
    },
    apiKey: {
      findMany: async (args: any) => {
        const results: any[] = [];
        for (const k of apiKeys.values()) {
          if (args.where?.tenantId && k.tenantId !== args.where.tenantId) continue;
          if (args.where?.revokedAt === null && k.revokedAt !== null) continue;
          let item: any = { ...k };
          if (args.include?.tenant) item.tenant = tenants.get(k.tenantId);
          // Apply select filter
          if (args.select) {
            const filtered: any = {};
            for (const field of Object.keys(args.select)) {
              if (args.select[field]) filtered[field] = item[field];
            }
            item = filtered;
          }
          results.push(item);
        }
        return results;
      },
      findFirst: async (args: any) => {
        for (const k of apiKeys.values()) {
          let match = true;
          if (args.where?.id && k.id !== args.where.id) match = false;
          if (args.where?.keyHash && k.keyHash !== args.where.keyHash) match = false;
          if (args.where?.tenantId && k.tenantId !== args.where.tenantId) match = false;
          if (args.where?.revokedAt === null && k.revokedAt !== null) match = false;
          if (match) {
            const result: any = { ...k };
            if (args.include?.tenant) result.tenant = tenants.get(k.tenantId);
            return result;
          }
        }
        return null;
      },
      count: async (args: any) => {
        let count = 0;
        for (const k of apiKeys.values()) {
          if (args.where?.tenantId && k.tenantId !== args.where.tenantId) continue;
          if (args.where?.revokedAt === null && k.revokedAt !== null) continue;
          count++;
        }
        return count;
      },
      create: async (args: any) => {
        const id = nextId();
        const key = { id, ...args.data, revokedAt: null, lastUsedAt: null, createdAt: new Date() };
        apiKeys.set(id, key);
        return key;
      },
      update: async (args: any) => {
        const k = apiKeys.get(args.where.id);
        if (k) Object.assign(k, args.data);
        return k;
      },
      updateMany: async (args: any) => {
        let count = 0;
        for (const k of apiKeys.values()) {
          if (args.where?.tenantId && k.tenantId !== args.where.tenantId) continue;
          if (args.where?.revokedAt === null && k.revokedAt !== null) continue;
          Object.assign(k, args.data);
          count++;
        }
        return { count };
      },
    },
    event: {
      findFirst: async () => null,
      create: async (args: any) => {
        const id = nextId();
        const event = { id, ...args.data, createdAt: new Date() };
        events.set(id, event);
        return event;
      },
    },
    catalogItem: {
      findMany: async (args: any) => {
        const results: any[] = [];
        for (const c of catalogItems.values()) {
          if (args.where?.tenantId && c.tenantId !== args.where.tenantId) continue;
          if (args.where?.isAvailable !== undefined && c.isAvailable !== args.where.isAvailable) continue;
          results.push(c);
        }
        const skip = args.skip || 0;
        const take = args.take || 20;
        return results.slice(skip, skip + take);
      },
      count: async (args: any) => {
        let count = 0;
        for (const c of catalogItems.values()) {
          if (args.where?.tenantId && c.tenantId !== args.where.tenantId) continue;
          if (args.where?.isAvailable !== undefined && c.isAvailable !== args.where.isAvailable) continue;
          count++;
        }
        return count;
      },
      findFirst: async (args: any) => {
        for (const c of catalogItems.values()) {
          if (args.where?.id && c.id !== args.where.id) continue;
          if (args.where?.tenantId && c.tenantId !== args.where.tenantId) continue;
          return c;
        }
        return null;
      },
      findUnique: async (args: any) => {
        return catalogItems.get(args.where.id) || null;
      },
      create: async (args: any) => {
        const id = nextId();
        const item = { id, ...args.data, isAvailable: true, createdAt: new Date(), updatedAt: new Date() };
        catalogItems.set(id, item);
        return item;
      },
      update: async (args: any) => {
        const c = catalogItems.get(args.where.id);
        if (c) Object.assign(c, args.data, { updatedAt: new Date() });
        return c;
      },
      upsert: async (args: any) => {
        const existing = catalogItems.get(args.where.id);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const id = args.where.id || nextId();
        const item = { id, ...args.create, isAvailable: true, createdAt: new Date(), updatedAt: new Date() };
        catalogItems.set(id, item);
        return item;
      },
    },
    widgetConfig: {
      findMany: async (args: any) => {
        const results: any[] = [];
        for (const w of widgetConfigs.values()) {
          if (args.where?.tenantId && w.tenantId !== args.where.tenantId) continue;
          results.push(w);
        }
        return results;
      },
      findFirst: async (args: any) => {
        for (const w of widgetConfigs.values()) {
          let match = true;
          if (args.where?.id && w.id !== args.where.id) match = false;
          if (args.where?.tenantId && w.tenantId !== args.where.tenantId) match = false;
          if (match) return w;
        }
        return null;
      },
      findUnique: async (args: any) => {
        if (args.where?.tenantId_placement) {
          for (const w of widgetConfigs.values()) {
            if (w.tenantId === args.where.tenantId_placement.tenantId &&
                w.placement === args.where.tenantId_placement.placement) return w;
          }
        }
        return widgetConfigs.get(args.where?.id) || null;
      },
      create: async (args: any) => {
        const id = nextId();
        const config = { id, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        widgetConfigs.set(id, config);
        return config;
      },
      update: async (args: any) => {
        const w = widgetConfigs.get(args.where.id);
        if (w) Object.assign(w, args.data, { updatedAt: new Date() });
        return w;
      },
      delete: async (args: any) => {
        const w = widgetConfigs.get(args.where.id);
        if (w) widgetConfigs.delete(args.where.id);
        return w;
      },
    },
  };
}

export async function buildTestServer(): Promise<FastifyInstance> {
  resetStores();

  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: true, credentials: true });
  await fastify.register(cookie);

  // Register mock prisma as a named plugin (auth depends on 'prisma')
  const mockPrisma = createMockPrisma();
  await fastify.register(fp(async (instance) => {
    instance.decorate('prisma', mockPrisma);
  }, { name: 'prisma' }));

  fastify.decorate('redis', null);

  // Register auth plugin (JWT + decorators)
  await fastify.register(authPlugin);

  // RFC 7807 error handler — must be set before routes
  // Uses duck typing instead of instanceof for cross-module compatibility
  fastify.setErrorHandler((error, request, reply) => {
    const err = error as any;
    if (err.statusCode && err.code && err.name) {
      return reply.status(err.statusCode).send({
        type: `https://api.recomengine.com/errors/${err.code.toLowerCase().replace(/_/g, '-')}`,
        title: err.name.replace('Error', ''),
        status: err.statusCode,
        detail: err.message,
        ...(err.errors ? { errors: err.errors } : {}),
      });
    }

    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      type: 'https://api.recomengine.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: statusCode,
      detail: error.message,
    });
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(tenantRoutes, { prefix: '/api/v1/tenants' });
  await fastify.register(apiKeyRoutes, { prefix: '/api/v1/tenants' });
  await fastify.register(eventRoutes, { prefix: '/api/v1/events' });
  await fastify.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  await fastify.register(widgetRoutes, { prefix: '/api/v1/tenants' });

  await fastify.ready();
  return fastify;
}

export async function createTestUser(app: FastifyInstance): Promise<{ token: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email: `test-${Date.now()}@example.com`, password: 'securepass123' },
  });
  const body = JSON.parse(res.body);
  return { token: body.data.token, userId: body.data.user.id };
}

export async function createTestTenant(app: FastifyInstance, token: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/tenants',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: `Test Tenant ${Date.now()}` },
  });
  const body = JSON.parse(res.body);
  return body.data.id;
}
