/**
 * Artifact endpoint integration tests
 *
 * Tests CRUD, elements, relationships, canvas save,
 * authentication, and error cases.
 * Traces to US-03.
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

describe('Artifact endpoints', () => {
  let app: FastifyInstance;
  let user: TestUser;
  let projectId: string;

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
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeaders(user.accessToken),
      payload: { name: 'Test Project', frameworkPreference: 'c4' },
    });
    projectId = res.json().id;
  });

  // ==================== CREATE ====================

  describe('POST /api/v1/projects/:projectId/artifacts', () => {
    it('should create an artifact', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'System Context',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('System Context');
      expect(body.type).toBe('c4_context');
      expect(body.framework).toBe('c4');
      expect(body.status).toBe('draft');
      expect(body.currentVersion).toBe(1);
      expect(body.createdBy.id).toBe(user.id);
    });

    it('should create with custom canvasData', async () => {
      const canvasData = {
        elements: [{ id: 'e1', name: 'User' }],
        relationships: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Custom Canvas',
          type: 'c4_container',
          framework: 'c4',
          canvasData,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.canvasData.elements).toHaveLength(1);
    });

    it('should return 400 for missing name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'c4_context', framework: 'c4' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid framework', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Bad Framework',
          type: 'test',
          framework: 'invalid',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        payload: {
          name: 'No Auth',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-member', async () => {
      const other = await createTestUser(app);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(other.accessToken),
        payload: {
          name: 'Intruder',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ==================== LIST ====================

  describe('GET /api/v1/projects/:projectId/artifacts', () => {
    it('should list artifacts for a project', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Artifact 1',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Artifact 2',
          type: 'c4_container',
          framework: 'c4',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBe(2);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: `/api/v1/projects/${projectId}/artifacts`,
          headers: authHeaders(user.accessToken),
          payload: {
            name: `Art ${i}`,
            type: 'c4_context',
            framework: 'c4',
          },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts?pageSize=2`,
        headers: authHeaders(user.accessToken),
      });

      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.nextCursor).toBeDefined();
    });

    it('should return empty list for project with no artifacts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(0);
    });
  });

  // ==================== GET BY ID ====================

  describe('GET /api/v1/projects/:projectId/artifacts/:artifactId', () => {
    it('should return artifact by ID', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Lookup Test',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Lookup Test');
    });

    it('should return 404 for non-existent artifact', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE ====================

  describe('PUT /api/v1/projects/:projectId/artifacts/:artifactId', () => {
    it('should update artifact name', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Original',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Updated');
    });

    it('should auto-version when canvasData changes', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Versioned',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = createRes.json().id;
      expect(createRes.json().currentVersion).toBe(1);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
        payload: {
          canvasData: {
            elements: [{ id: 'e1' }],
            relationships: [],
            viewport: { x: 0, y: 0, zoom: 2 },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().currentVersion).toBe(2);
    });

    it('should update status to published', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Status Test',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'published' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('published');
    });

    it('should return 404 for non-existent artifact', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
        payload: { name: 'Ghost' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== DELETE ====================

  describe('DELETE /api/v1/projects/:projectId/artifacts/:artifactId', () => {
    it('should delete artifact (owner)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Delete Me',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = createRes.json().id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent artifact', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ELEMENTS ====================

  describe('Elements CRUD', () => {
    let artifactId: string;

    beforeEach(async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Element Test',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      artifactId = createRes.json().id;
    });

    it('should add an element', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
        payload: {
          elementId: 'user-001',
          elementType: 'person',
          framework: 'c4',
          name: 'End User',
          description: 'A user of the system',
          position: { x: 100, y: 200, width: 200, height: 100 },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.elementId).toBe('user-001');
      expect(body.name).toBe('End User');
      expect(body.position).toEqual({
        x: 100,
        y: 200,
        width: 200,
        height: 100,
      });
    });

    it('should list elements', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
        payload: {
          elementId: 'el-1',
          elementType: 'person',
          framework: 'c4',
          name: 'User A',
        },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
        payload: {
          elementId: 'el-2',
          elementType: 'system',
          framework: 'c4',
          name: 'System B',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(2);
    });

    it('should update an element', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
        payload: {
          elementId: 'upd-1',
          elementType: 'person',
          framework: 'c4',
          name: 'Old Name',
        },
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements/upd-1`,
        headers: authHeaders(user.accessToken),
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('New Name');
    });

    it('should delete an element', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
        payload: {
          elementId: 'del-1',
          elementType: 'person',
          framework: 'c4',
          name: 'To Delete',
        },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements/del-1`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements`,
        headers: authHeaders(user.accessToken),
      });
      expect(listRes.json().data).toHaveLength(0);
    });

    it('should return 404 for updating non-existent element', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/elements/nonexistent`,
        headers: authHeaders(user.accessToken),
        payload: { name: 'Ghost' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== RELATIONSHIPS ====================

  describe('Relationships CRUD', () => {
    let artifactId: string;

    beforeEach(async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Rel Test',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      artifactId = createRes.json().id;
    });

    it('should add a relationship', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/relationships`,
        headers: authHeaders(user.accessToken),
        payload: {
          relationshipId: 'rel-001',
          sourceElementId: 'src-1',
          targetElementId: 'tgt-1',
          relationshipType: 'uses',
          framework: 'c4',
          label: 'Makes API calls',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.relationshipId).toBe('rel-001');
      expect(body.sourceElementId).toBe('src-1');
      expect(body.label).toBe('Makes API calls');
    });

    it('should list relationships', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/relationships`,
        headers: authHeaders(user.accessToken),
        payload: {
          relationshipId: 'r1',
          sourceElementId: 's1',
          targetElementId: 't1',
          relationshipType: 'uses',
          framework: 'c4',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/relationships`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('should delete a relationship', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/relationships`,
        headers: authHeaders(user.accessToken),
        payload: {
          relationshipId: 'rdel-1',
          sourceElementId: 's1',
          targetElementId: 't1',
          relationshipType: 'uses',
          framework: 'c4',
        },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/relationships/rdel-1`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for deleting non-existent relationship', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/relationships/nonexistent`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== CANVAS SAVE ====================

  describe('PUT /api/v1/projects/:projectId/artifacts/:artifactId/canvas', () => {
    it('should save canvas and increment version', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Canvas Test',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = createRes.json().id;
      expect(createRes.json().currentVersion).toBe(1);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/canvas`,
        headers: authHeaders(user.accessToken),
        payload: {
          canvasData: {
            elements: [{ id: 'e1', name: 'Saved' }],
            relationships: [],
            viewport: { x: 10, y: 20, zoom: 1.5 },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().currentVersion).toBe(2);
    });

    it('should return 404 for non-existent artifact', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000/canvas`,
        headers: authHeaders(user.accessToken),
        payload: { canvasData: {} },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== AUDIT ====================

  describe('Audit logging', () => {
    it('should log artifact.create', async () => {
      const { getPrisma } = require('../helpers');
      const prisma = getPrisma();

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Audited',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = res.json().id;

      const logs = await prisma.auditLog.findMany({
        where: { resourceId: artifactId, action: 'artifact.create' },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(user.id);
    });
  });
});
