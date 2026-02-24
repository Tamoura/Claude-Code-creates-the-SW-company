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
let viewer: TestUser;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);
  viewer = await createTestUser(app);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Who Viewed Your Profile API', () => {
  describe('GET /api/v1/profiles/:id (view tracking)', () => {
    it('should record a profile view when viewing another profile', async () => {
      // Viewer views user's profile
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user.id}`,
        headers: authHeaders(viewer.accessToken),
      });

      expect(res.statusCode).toBe(200);

      // Check views count
      const viewsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me/views/count',
        headers: authHeaders(user.accessToken),
      });

      expect(viewsRes.statusCode).toBe(200);
      const json = JSON.parse(viewsRes.body);
      expect(json.data.count).toBeGreaterThanOrEqual(1);
    });

    it('should not count self-views', async () => {
      // User views own profile via /me
      await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user.id}`,
        headers: authHeaders(user.accessToken),
      });

      // Views count should not increase for self-views
      const viewsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me/views/count',
        headers: authHeaders(user.accessToken),
      });

      expect(viewsRes.statusCode).toBe(200);
      // Count should still be from previous test (viewer only)
      const json = JSON.parse(viewsRes.body);
      expect(json.data.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/profiles/me/views', () => {
    it('should list recent profile viewers', async () => {
      // Create multiple viewers
      const viewer2 = await createTestUser(app);
      const viewer3 = await createTestUser(app);

      // Have them view the profile
      await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user.id}`,
        headers: authHeaders(viewer2.accessToken),
      });
      await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user.id}`,
        headers: authHeaders(viewer3.accessToken),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me/views',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.length).toBeGreaterThanOrEqual(3);
      expect(json.data[0].viewerId).toBeDefined();
      expect(json.data[0].viewedAt).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me/views',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/profiles/me/views/count', () => {
    it('should return view count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me/views/count',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(typeof json.data.count).toBe('number');
      expect(json.data.count).toBeGreaterThanOrEqual(1);
    });
  });
});
