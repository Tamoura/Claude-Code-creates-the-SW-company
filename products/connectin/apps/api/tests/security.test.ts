import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
} from './helpers';
import { buildApp } from '../src/app';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

// Build a separate app with rate limiting enabled for rate-limit header tests
let rateLimitedApp: FastifyInstance | null = null;
async function getRateLimitedApp(): Promise<FastifyInstance> {
  if (!rateLimitedApp) {
    rateLimitedApp = await buildApp({ skipRateLimit: false });
    await rateLimitedApp.ready();
  }
  return rateLimitedApp;
}

afterAll(async () => {
  if (rateLimitedApp) {
    await rateLimitedApp.close();
    rateLimitedApp = null;
  }
});

describe('Security Tests', () => {
  describe('BOLA — Broken Object Level Authorization', () => {
    it('user cannot accept another user\'s connection request', async () => {
      const app = await getApp();
      const userA = await createTestUser(app, { email: 'bola-a@test.com' });
      const userB = await createTestUser(app, { email: 'bola-b@test.com' });
      const userC = await createTestUser(app, { email: 'bola-c@test.com' });

      // A sends request to B
      const reqRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(userA.accessToken),
        payload: { receiverId: userB.id },
      });

      const connectionId = JSON.parse(reqRes.body).data.connectionId;

      // C tries to accept B's request — should be forbidden
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/connections/${connectionId}/accept`,
        headers: authHeaders(userC.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('BFLA — Broken Function Level Authorization', () => {
    it('unauthenticated user cannot access profile endpoint', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
      });

      expect(res.statusCode).toBe(401);
    });

    it('unauthenticated user cannot create posts', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        payload: { content: 'Test post' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('unauthenticated user cannot delete account', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
      });

      expect(res.statusCode).toBe(401);
    });

    it('unauthenticated user cannot export data', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Account Lockout', () => {
    it('locks account after 5 failed attempts', async () => {
      const app = await getApp();
      await createTestUser(app, { email: 'lockout@test.com' });

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email: 'lockout@test.com',
            password: 'WrongP@ss1',
          },
        });
      }

      // 6th attempt with correct password should be locked
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'lockout@test.com',
          password: 'TestP@ss1',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('locked');
    });
  });

  describe('Account Deletion', () => {
    it('soft deletes account and invalidates sessions', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'delete-me@test.com',
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      // Login should fail after deletion
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'delete-me@test.com',
          password: 'TestP@ss1',
        },
      });

      expect(loginRes.statusCode).toBe(401);
    });
  });

  describe('Data Export', () => {
    it('exports user data for GDPR compliance', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'export@test.com',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.exportedAt).toBeDefined();
      expect(body.data.user.email).toBe('export@test.com');
      // Should not contain password hash
      expect(body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('XSS Prevention', () => {
    it('strips HTML from post content', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'xss@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Hello <script>alert("xss")</script> world',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.content).not.toContain('<script>');
      expect(body.data.content).toContain('Hello');
      expect(body.data.content).toContain('world');
    });
  });

  describe('Anti-Enumeration', () => {
    it('register with existing email returns same response', async () => {
      const app = await getApp();

      // First registration
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'enum@test.com',
          password: 'SecureP@ss1',
          displayName: 'First',
        },
      });

      // Second registration with same email
      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'enum@test.com',
          password: 'SecureP@ss1',
          displayName: 'Second',
        },
      });

      // Both should return 201 with same structure
      expect(first.statusCode).toBe(201);
      expect(second.statusCode).toBe(201);
    });
  });

  describe('Profile endpoint rate limits (RISK-004)', () => {
    // Per-route rate limit should be 60/min (not the global 1000)
    it('GET /profiles/me has per-route rate limit of 60', async () => {
      const rlApp = await getRateLimitedApp();
      const user = await createTestUser(undefined, {
        email: 'rl-me@test.com',
      });

      const res = await rlApp.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('60');
    });

    it('PUT /profiles/me has per-route rate limit of 60', async () => {
      const rlApp = await getRateLimitedApp();
      const user = await createTestUser(undefined, {
        email: 'rl-put@test.com',
      });

      const res = await rlApp.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
        payload: { headlineEn: 'Test headline' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('60');
    });

    it('POST /profiles/me/experience has per-route rate limit of 60', async () => {
      const rlApp = await getRateLimitedApp();
      const user = await createTestUser(undefined, {
        email: 'rl-exp@test.com',
      });

      const res = await rlApp.inject({
        method: 'POST',
        url: '/api/v1/profiles/me/experience',
        headers: authHeaders(user.accessToken),
        payload: {
          title: 'Engineer',
          company: 'ACME',
          startDate: '2024-01-01',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.headers['x-ratelimit-limit']).toBe('60');
    });

    it('POST /profiles/me/skills has per-route rate limit of 60', async () => {
      const rlApp = await getRateLimitedApp();
      const user = await createTestUser(undefined, {
        email: 'rl-skill@test.com',
      });

      const { getPrisma } = await import('./helpers');
      const db = getPrisma();
      const skill = await db.skill.create({
        data: { nameEn: 'TypeScript-RL' },
      });

      const res = await rlApp.inject({
        method: 'POST',
        url: '/api/v1/profiles/me/skills',
        headers: authHeaders(user.accessToken),
        payload: { skillIds: [skill.id] },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('60');
    });
  });

  describe('Body Size Limit', () => {
    it('rejects request body exceeding 1 MB', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'body-limit@test.com',
      });

      // 1.5 MB payload
      const largeBody = { content: 'x'.repeat(1_500_000) };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: largeBody,
      });

      expect(res.statusCode).toBe(413);
    });
  });
});
