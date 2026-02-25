/**
 * Comment endpoint integration tests
 *
 * Tests CRUD, threading, element anchoring, resolve, auth.
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

describe('Comment endpoints', () => {
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
      payload: { name: 'Comment Test Project', frameworkPreference: 'c4' },
    });
    projectId = projRes.json().id;

    const artRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts`,
      headers: authHeaders(user.accessToken),
      payload: {
        name: 'Commented Artifact',
        type: 'c4_context',
        framework: 'c4',
      },
    });
    artifactId = artRes.json().id;
  });

  // ==================== CREATE ====================

  describe('POST /api/v1/artifacts/:artifactId/comments', () => {
    it('should create a comment', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'This looks great!' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.body).toBe('This looks great!');
      expect(body.status).toBe('open');
      expect(body.author.id).toBe(user.id);
      expect(body.parentCommentId).toBeNull();
    });

    it('should create a threaded reply', async () => {
      const parentRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Parent comment' },
      });
      const parentId = parentRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: {
          body: 'Reply to parent',
          parentCommentId: parentId,
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().parentCommentId).toBe(parentId);
    });

    it('should create element-anchored comment', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: {
          body: 'Element feedback',
          elementId: 'el-001',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().elementId).toBe('el-001');
    });

    it('should return 400 for empty body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: '' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        payload: { body: 'No auth' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent parent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: {
          body: 'Orphan reply',
          parentCommentId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== LIST ====================

  describe('GET /api/v1/artifacts/:artifactId/comments', () => {
    it('should list all comments', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Comment 1' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Comment 2' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const c1Res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'To resolve' },
      });
      const c1Id = c1Res.json().id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments/${c1Id}/resolve`,
        headers: authHeaders(user.accessToken),
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Still open' },
      });

      const openRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/comments?status=open`,
        headers: authHeaders(user.accessToken),
      });
      expect(openRes.json().data).toHaveLength(1);

      const resolvedRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/comments?status=resolved`,
        headers: authHeaders(user.accessToken),
      });
      expect(resolvedRes.json().data).toHaveLength(1);
    });

    it('should filter by elementId', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'For el-1', elementId: 'el-1' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'For el-2', elementId: 'el-2' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/comments?elementId=el-1`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.json().data).toHaveLength(1);
      expect(res.json().data[0].elementId).toBe('el-1');
    });
  });

  // ==================== UPDATE ====================

  describe('PUT /api/v1/artifacts/:artifactId/comments/:commentId', () => {
    it('should update comment body (author only)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Original' },
      });
      const commentId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/artifacts/${artifactId}/comments/${commentId}`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Edited' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().body).toBe('Edited');
    });

    it('should return 403 for non-author', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'By owner' },
      });
      const commentId = createRes.json().id;

      // Add another user to project first
      const other = await createTestUser(app);
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(user.accessToken),
        payload: { email: other.email, role: 'editor' },
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/artifacts/${artifactId}/comments/${commentId}`,
        headers: authHeaders(other.accessToken),
        payload: { body: 'Hijacked' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ==================== DELETE ====================

  describe('DELETE /api/v1/artifacts/:artifactId/comments/:commentId', () => {
    it('should delete comment (author only)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'To delete' },
      });
      const commentId = createRes.json().id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/artifacts/${artifactId}/comments/${commentId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/artifacts/${artifactId}/comments/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== RESOLVE ====================

  describe('POST /api/v1/artifacts/:artifactId/comments/:commentId/resolve', () => {
    it('should resolve a comment', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments`,
        headers: authHeaders(user.accessToken),
        payload: { body: 'Needs fix' },
      });
      const commentId = createRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/comments/${commentId}/resolve`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('resolved');
      expect(res.json().resolvedAt).toBeDefined();
    });
  });
});
