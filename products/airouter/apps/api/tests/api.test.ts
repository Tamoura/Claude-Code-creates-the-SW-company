import './setup';
import Fastify, { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { initializeEncryption, encryptSecret } from '../src/utils/encryption';
import { hashPassword, generateApiKey, hashApiKey, getApiKeyPrefix } from '../src/utils/crypto';
import authRoutes from '../src/routes/v1/auth';
import providerRoutes from '../src/routes/v1/providers';
import keyRoutes from '../src/routes/v1/keys';
import usageRoutes from '../src/routes/v1/usage';
import chatRoutes from '../src/routes/v1/chat';
import authPlugin from '../src/plugins/auth';
import { AppError } from '../src/types';

// In-memory data stores for mocking
let users: any[] = [];
let apiKeys: any[] = [];
let providerKeys: any[] = [];
let usageRecords: any[] = [];
let idCounter = 0;

function nextId() {
  return `test-id-${++idCounter}`;
}

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email) return Promise.resolve(users.find(u => u.email === where.email) || null);
        if (where.id) return Promise.resolve(users.find(u => u.id === where.id) || null);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const user = { id: nextId(), ...data, role: 'USER', createdAt: new Date(), updatedAt: new Date() };
        users.push(user);
        return Promise.resolve(user);
      }),
    },
    apiKey: {
      findUnique: jest.fn().mockImplementation(({ where, include }) => {
        let key: any = null;
        if (where.keyHash) key = apiKeys.find(k => k.keyHash === where.keyHash);
        if (where.id) key = apiKeys.find(k => k.id === where.id);
        if (key && include?.user) {
          key = { ...key, user: users.find(u => u.id === key.userId) };
        }
        return Promise.resolve(key || null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(apiKeys.find(k => k.id === where.id && k.userId === where.userId) || null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(apiKeys.filter(k => k.userId === where.userId));
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const key = { id: nextId(), ...data, lastUsedAt: null, createdAt: new Date() };
        apiKeys.push(key);
        return Promise.resolve(key);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const key = apiKeys.find(k => k.id === where.id);
        if (key) Object.assign(key, data);
        return Promise.resolve(key);
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        apiKeys = apiKeys.filter(k => k.id !== where.id);
        return Promise.resolve({});
      }),
    },
    providerKey: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.userId_provider) {
          return Promise.resolve(providerKeys.find(
            k => k.userId === where.userId_provider.userId && k.provider === where.userId_provider.provider
          ) || null);
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(providerKeys.find(k => k.id === where.id && k.userId === where.userId) || null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(providerKeys.filter(k => {
          if (where.userId && k.userId !== where.userId) return false;
          if (where.isValid !== undefined && k.isValid !== where.isValid) return false;
          return true;
        }));
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const key = { id: nextId(), ...data, isValid: true, lastTestedAt: null, createdAt: new Date(), updatedAt: new Date() };
        providerKeys.push(key);
        return Promise.resolve(key);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const key = providerKeys.find(k => k.id === where.id);
        if (key) Object.assign(key, data);
        return Promise.resolve(key);
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        providerKeys = providerKeys.filter(k => k.id !== where.id);
        return Promise.resolve({});
      }),
    },
    usageRecord: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

let app: FastifyInstance;
let mockPrisma: any;

async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: true });
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  mockPrisma = createMockPrisma();

  // Register mock prisma as a named plugin so authPlugin's dependency is satisfied
  await fastify.register(fp(async (instance) => {
    instance.decorate('prisma', mockPrisma);
  }, { name: 'prisma' }));

  fastify.decorate('redis', null);

  await fastify.register(authPlugin);

  // Error handler must be set before routes are registered
  fastify.setErrorHandler((error: any, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }
    // Zod validation errors (check name and issues array)
    if (error.name === 'ZodError' || (Array.isArray(error.issues) && error.issues.length > 0)) {
      return reply.code(400).send({
        type: 'https://airouter.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error.message,
      });
    }
    // Fastify validation errors
    if (error.validation || error.statusCode === 400) {
      return reply.code(400).send({
        type: 'https://airouter.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error.message,
      });
    }
    return reply.code(500).send({ status: 500, detail: error.message });
  });

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(providerRoutes, { prefix: '/api/v1/providers' });
  await fastify.register(keyRoutes, { prefix: '/api/v1/keys' });
  await fastify.register(usageRoutes, { prefix: '/api/v1/usage' });
  await fastify.register(chatRoutes, { prefix: '/v1' });

  fastify.get('/health', async () => ({ status: 'healthy' }));

  return fastify;
}

beforeAll(async () => {
  initializeEncryption();
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  users = [];
  apiKeys = [];
  providerKeys = [];
  usageRecords = [];
  idCounter = 0;
});

// Helper to sign up and get a token
async function signupAndGetToken(email = 'test@example.com', password = 'SecurePass123!') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email, password },
  });
  return JSON.parse(res.body);
}

describe('API Routes', () => {
  describe('Health Check', () => {
    it('GET /health should return healthy', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('healthy');
    });
  });

  describe('Auth - Signup', () => {
    it('POST /api/v1/auth/signup should create a user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'new@example.com', password: 'MyP@ssw0rd!' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.email).toBe('new@example.com');
      expect(body.access_token).toBeTruthy();
    });

    it('should reject duplicate email', async () => {
      await signupAndGetToken('dup@example.com');
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'dup@example.com', password: 'MyP@ssw0rd!' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('should reject short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'bad@example.com', password: 'short' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Auth - Login', () => {
    it('POST /api/v1/auth/login should authenticate', async () => {
      await signupAndGetToken('login@example.com', 'LoginPass123!');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@example.com', password: 'LoginPass123!' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.access_token).toBeTruthy();
    });

    it('should reject invalid password', async () => {
      await signupAndGetToken('auth@example.com', 'CorrectPass!');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'auth@example.com', password: 'WrongPass!' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nobody@example.com', password: 'SomePass!' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Auth - API Keys', () => {
    it('should create and list API keys', async () => {
      const { access_token } = await signupAndGetToken();

      // Create
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { name: 'My Key' },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.body);
      expect(created.key).toMatch(/^air_live_/);
      expect(created.name).toBe('My Key');

      // List
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/api-keys',
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.body);
      expect(list.data.length).toBe(1);
      // Full key should NOT be in list response
      expect(list.data[0].key).toBeUndefined();
    });

    it('should delete an API key', async () => {
      const { access_token } = await signupAndGetToken();

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { name: 'Delete Me' },
      });
      const { id } = JSON.parse(createRes.body);

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/api-keys/${id}`,
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(deleteRes.statusCode).toBe(204);
    });

    it('should require auth to create API keys', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        payload: { name: 'No Auth' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Providers', () => {
    it('GET /api/v1/providers should list all providers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(10);
      expect(body.data[0].slug).toBeTruthy();
      expect(body.data[0].free_tier).toBeTruthy();
    });

    it('GET /api/v1/providers/:slug should return provider details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers/groq',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe('Groq');
      expect(body.key_acquisition_guide).toBeTruthy();
    });

    it('GET /api/v1/providers/:slug should 404 for unknown', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers/nonexistent',
      });
      expect(res.statusCode).toBe(404);
    });

    it('GET /api/v1/providers/:slug/guide should return guide', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/providers/google-gemini/guide',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.provider).toBe('Google Gemini');
      expect(body.guide).toContain('Google AI Studio');
      expect(body.signup_url).toBeTruthy();
    });
  });

  describe('Key Vault', () => {
    it('should add, list, and delete a provider key', async () => {
      const { access_token } = await signupAndGetToken();

      // Add
      const addRes = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { provider: 'groq', api_key: 'gsk_test1234567890' },
      });
      expect(addRes.statusCode).toBe(201);
      const added = JSON.parse(addRes.body);
      expect(added.provider).toBe('groq');
      expect(added.key_prefix).toBe('gsk_test...');

      // List
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.body);
      expect(list.data.length).toBe(1);
      expect(list.data[0].provider_name).toBe('Groq');

      // Delete
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/keys/${added.id}`,
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(deleteRes.statusCode).toBe(204);
    });

    it('should reject duplicate provider key', async () => {
      const { access_token } = await signupAndGetToken();

      await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { provider: 'groq', api_key: 'gsk_first' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { provider: 'groq', api_key: 'gsk_second' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('should reject unknown provider', async () => {
      const { access_token } = await signupAndGetToken();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { provider: 'fake-provider', api_key: 'key123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should test key validity', async () => {
      const { access_token } = await signupAndGetToken();

      const addRes = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { provider: 'groq', api_key: 'gsk_test1234567890' },
      });
      const { id } = JSON.parse(addRes.body);

      const testRes = await app.inject({
        method: 'POST',
        url: `/api/v1/keys/${id}/test`,
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(testRes.statusCode).toBe(200);
      const body = JSON.parse(testRes.body);
      expect(body.is_valid).toBe(true);
    });

    it('should require auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/keys',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Chat Completions (Router)', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('should route to available provider', async () => {
      const { access_token, id: userId } = await signupAndGetToken();

      // Add a provider key
      await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${access_token}` },
        payload: { provider: 'groq', api_key: 'gsk_test_key' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        headers: { authorization: `Bearer ${access_token}` },
        payload: {
          messages: [{ role: 'user', content: 'Hello, world!' }],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.choices).toBeDefined();
      expect(body.choices.length).toBe(1);
      expect(body.provider).toBe('groq');
      expect(body.usage).toBeDefined();
    });

    it('should return error when no keys configured', async () => {
      const { access_token } = await signupAndGetToken();

      const res = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        headers: { authorization: `Bearer ${access_token}` },
        payload: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.detail).toContain('No provider keys');
    });
  });

  describe('Usage', () => {
    it('should return empty usage for new user', async () => {
      const { access_token } = await signupAndGetToken();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/usage',
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data).toEqual([]);
    });

    it('should return provider-specific usage', async () => {
      const { access_token } = await signupAndGetToken();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/usage/groq',
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.provider).toBe('groq');
      expect(body.provider_name).toBe('Groq');
      expect(body.free_tier).toBeDefined();
    });

    it('should 404 for unknown provider usage', async () => {
      const { access_token } = await signupAndGetToken();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/usage/nonexistent',
        headers: { authorization: `Bearer ${access_token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should require auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/usage',
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
