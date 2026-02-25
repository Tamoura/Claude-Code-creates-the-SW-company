/**
 * Version endpoint integration tests
 *
 * Tests list, auto-version on canvas save, diff, restore, auth.
 * Traces to US-06.
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

describe('Version endpoints', () => {
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
      payload: { name: 'Version Test Project', frameworkPreference: 'c4' },
    });
    projectId = projRes.json().id;

    const artRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts`,
      headers: authHeaders(user.accessToken),
      payload: {
        name: 'Versioned Artifact',
        type: 'c4_context',
        framework: 'c4',
      },
    });
    artifactId = artRes.json().id;
  });

  // ==================== LIST ====================

  describe('GET /api/v1/artifacts/:artifactId/versions', () => {
    it('should list initial version after creation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].versionNumber).toBe(1);
      expect(body.data[0].changeType).toBe('creation');
    });

    it('should list multiple versions after canvas saves', async () => {
      // Save canvas twice to create versions 2 and 3
      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/canvas`,
        headers: authHeaders(user.accessToken),
        payload: { canvasData: { elements: [{ id: 'v2' }] } },
      });
      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/canvas`,
        headers: authHeaders(user.accessToken),
        payload: { canvasData: { elements: [{ id: 'v3' }] } },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(3);
      // Ordered descending by version number
      expect(body.data[0].versionNumber).toBe(3);
      expect(body.data[2].versionNumber).toBe(1);
    });

    it('should support pagination', async () => {
      // Create extra versions
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'PUT',
          url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/canvas`,
          headers: authHeaders(user.accessToken),
          payload: { canvasData: { elements: [{ id: `page-${i}` }] } },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions?pageSize=2`,
        headers: authHeaders(user.accessToken),
      });

      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.meta.hasMore).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent artifact', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/artifacts/00000000-0000-0000-0000-000000000000/versions',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 for non-member', async () => {
      const other = await createTestUser(app);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(other.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ==================== GET BY ID ====================

  describe('GET /api/v1/artifacts/:artifactId/versions/:versionId', () => {
    it('should return a specific version', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });
      const versionId = listRes.json().data[0].id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions/${versionId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().versionNumber).toBe(1);
    });

    it('should return 404 for non-existent version', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== DIFF ====================

  describe('GET /api/v1/artifacts/:artifactId/versions/:fromId/diff/:toId', () => {
    it('should compute diff between two versions', async () => {
      // Version 1 created at artifact creation, save new canvas for version 2
      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/canvas`,
        headers: authHeaders(user.accessToken),
        payload: {
          canvasData: {
            elements: [
              { id: 'e1', name: 'Existing' },
              { id: 'e2', name: 'New' },
            ],
          },
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });
      const versions = listRes.json().data;
      // versions[0] = v2 (newest), versions[1] = v1 (oldest)
      const fromId = versions[1].id;
      const toId = versions[0].id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions/${fromId}/diff/${toId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.fromVersion).toBe(1);
      expect(body.toVersion).toBe(2);
      expect(body.changes).toBeDefined();
      expect(body.changes.added).toBeDefined();
    });

    it('should return 404 if version does not exist', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });
      const fromId = listRes.json().data[0].id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions/${fromId}/diff/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== RESTORE ====================

  describe('POST /api/v1/artifacts/:artifactId/versions/:versionId/restore', () => {
    it('should restore a version creating a new version', async () => {
      // Save new canvas (v2)
      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/canvas`,
        headers: authHeaders(user.accessToken),
        payload: {
          canvasData: {
            elements: [{ id: 'v2-el' }],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });
      const v1Id = listRes.json().data[1].id; // Version 1

      // Restore version 1
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/versions/${v1Id}/restore`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.versionNumber).toBe(3); // New version created
      expect(body.changeType).toBe('restore');

      // Verify artifact currentVersion is now 3
      const artRes = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });
      expect(artRes.json().currentVersion).toBe(3);
    });

    it('should restore with custom changeSummary', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/artifacts/${artifactId}/versions`,
        headers: authHeaders(user.accessToken),
      });
      const v1Id = listRes.json().data[0].id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/versions/${v1Id}/restore`,
        headers: authHeaders(user.accessToken),
        payload: { changeSummary: 'Rolling back to initial' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().changeSummary).toBe('Rolling back to initial');
    });

    it('should return 404 for non-existent version', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/artifacts/${artifactId}/versions/00000000-0000-0000-0000-000000000000/restore`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
