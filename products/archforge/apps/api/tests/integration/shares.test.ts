/**
 * Share endpoint integration tests
 *
 * Tests user share, link share, list, revoke, resolve link, auth.
 * Traces to US-08.
 */

import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from '../helpers';

describe('Share endpoints', () => {
  let app: FastifyInstance;
  let user: TestUser;
  let projectId: string;
  let artifactId: string;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    user = await createTestUser(app);

    const projRes = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeaders(user.accessToken),
      payload: { name: 'Share Test Project', frameworkPreference: 'c4' },
    });
    projectId = projRes.json().id;

    const artRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts`,
      headers: authHeaders(user.accessToken),
      payload: {
        name: 'Shared Artifact',
        type: 'c4_context',
        framework: 'c4',
      },
    });
    artifactId = artRes.json().id;
  });

  // ==================== USER SHARE ====================

  describe('POST /api/v1/artifacts/:artifactId/shares/user', () => {
    it('should share with a user by email', async () => {
      const other = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        headers: authHeaders(user.accessToken),
        payload: { email: other.email, permission: 'view' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.shareType).toBe('user');
      expect(body.permission).toBe('view');
      expect(body.sharedWith.id).toBe(other.id);
      expect(body.sharedBy.id).toBe(user.id);
    });

    it('should return 404 for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        headers: authHeaders(user.accessToken),
        payload: { email: 'ghost@nowhere.com', permission: 'edit' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 409 for duplicate share', async () => {
      const other = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        headers: authHeaders(user.accessToken),
        payload: { email: other.email, permission: 'view' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        headers: authHeaders(user.accessToken),
        payload: { email: other.email, permission: 'edit' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        payload: { email: 'test@test.com', permission: 'view' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== LINK SHARE ====================

  describe('POST /api/v1/artifacts/:artifactId/shares/link', () => {
    it('should create a share link', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/link`,
        headers: authHeaders(user.accessToken),
        payload: { permission: 'view' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.shareType).toBe('link');
      expect(body.linkToken).toBeDefined();
      expect(body.linkToken.length).toBe(64); // 32 bytes hex
      expect(body.expiresAt).toBeNull();
    });

    it('should create a share link with expiry', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/link`,
        headers: authHeaders(user.accessToken),
        payload: { permission: 'comment', expiresInHours: 24 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().expiresAt).toBeDefined();
    });
  });

  // ==================== LIST ====================

  describe('GET /api/v1/artifacts/:artifactId/shares', () => {
    it('should list all shares', async () => {
      const other = await createTestUser(app);
      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        headers: authHeaders(user.accessToken),
        payload: { email: other.email, permission: 'view' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/link`,
        headers: authHeaders(user.accessToken),
        payload: { permission: 'edit' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/shares`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(2);
    });

    it('should return empty list when no shares', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/shares`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(0);
    });
  });

  // ==================== REVOKE ====================

  describe('DELETE /api/v1/artifacts/:artifactId/shares/:shareId', () => {
    it('should revoke a share (sharer only)', async () => {
      const other = await createTestUser(app);
      const shareRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/user`,
        headers: authHeaders(user.accessToken),
        payload: { email: other.email, permission: 'view' },
      });
      const shareId = shareRes.json().id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/artifacts/${artifactId}/shares/${shareId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      // Verify removed
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/shares`,
        headers: authHeaders(user.accessToken),
      });
      expect(listRes.json().data).toHaveLength(0);
    });

    it('should return 404 for non-existent share', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/artifacts/${artifactId}/shares/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== RESOLVE LINK ====================

  describe('GET /api/v1/artifacts/shares/link/:token', () => {
    it('should resolve a valid link token', async () => {
      const shareRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/shares/link`,
        headers: authHeaders(user.accessToken),
        payload: { permission: 'view' },
      });
      const token = shareRes.json().linkToken;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/shares/link/${token}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().artifactId).toBe(artifactId);
      expect(res.json().permission).toBe('view');
    });

    it('should return 404 for invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/artifacts/shares/link/invalidtoken123',
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
