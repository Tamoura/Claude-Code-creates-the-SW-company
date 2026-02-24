import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from './helpers';

let app: FastifyInstance;
let user: TestUser;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Custom URL / Vanity Slug API', () => {
  describe('PUT /api/v1/profiles/me/slug', () => {
    it('should claim a vanity slug', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(user.accessToken),
        payload: { slug: 'johndoe' },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.slug).toBe('johndoe');
    });

    it('should reject invalid slugs (special chars)', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(user.accessToken),
        payload: { slug: 'john doe!' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('should reject too-short slugs', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(user.accessToken),
        payload: { slug: 'ab' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('should reject duplicate slugs', async () => {
      const otherUser = await createTestUser(app);

      // First user claims slug
      await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(user.accessToken),
        payload: { slug: 'uniqueslug' },
      });

      // Second user tries same slug
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(otherUser.accessToken),
        payload: { slug: 'uniqueslug' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should allow updating own slug', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(user.accessToken),
        payload: { slug: 'newslug' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.slug).toBe('newslug');
    });
  });

  describe('GET /api/v1/profiles/by-slug/:slug', () => {
    it('should resolve a profile by slug', async () => {
      // Set slug first
      await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/slug',
        headers: authHeaders(user.accessToken),
        payload: { slug: 'findme' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/by-slug/findme',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.userId).toBe(user.id);
    });

    it('should return 404 for unknown slug', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/by-slug/nonexistent',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
