/**
 * Project endpoint integration tests
 *
 * Tests CRUD, archive/restore, delete with confirmation,
 * search, pagination, and authorization.
 * Traces to PRD US-05 (AC-05.1 through AC-05.7).
 */

import { FastifyInstance } from 'fastify';
import { getApp, closeApp, cleanDatabase, createTestUser, authHeaders, getPrisma } from '../helpers';

describe('Project endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ==================== CREATE ====================

  describe('POST /api/v1/projects', () => {
    // AC-05.1: Create project with name, description, framework preference
    it('should create a project with valid data (AC-05.1)', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: {
          name: 'Cloud Migration 2026',
          description: 'Architecture for cloud migration initiative',
          frameworkPreference: 'c4',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Cloud Migration 2026');
      expect(body.description).toBe('Architecture for cloud migration initiative');
      expect(body.frameworkPreference).toBe('c4');
      expect(body.status).toBe('active');
      expect(body.artifactCount).toBe(0);
      expect(body.createdBy.id).toBe(user.id);
      expect(body.createdAt).toBeDefined();
      expect(body.archivedAt).toBeNull();
    });

    it('should create a project with defaults (description=null, framework=auto)', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Minimal Project' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.description).toBeNull();
      expect(body.frameworkPreference).toBe('auto');
    });

    it('should return 400 for missing name', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { description: 'No name' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for whitespace-only name', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: '   ' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for name exceeding 255 characters', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'x'.repeat(256) },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: { name: 'Unauthorized Project' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should allow duplicate project names', async () => {
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Same Name' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Same Name' },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  // ==================== LIST ====================

  describe('GET /api/v1/projects', () => {
    // AC-05.2: List projects with name, description, last-modified, artifact count
    it('should list active projects (AC-05.2)', async () => {
      const user = await createTestUser(app);

      for (const name of ['Project A', 'Project B', 'Project C']) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/projects',
          headers: authHeaders(user.accessToken),
          payload: { name },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(3);
      expect(body.meta.total).toBe(3);
      expect(body.meta.hasMore).toBe(false);

      const project = body.data[0];
      expect(project.name).toBeDefined();
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
      expect(project.artifactCount).toBe(0);
    });

    it('should return empty list when no projects exist', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
    });

    it('should only show active projects by default', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Active Project' },
      });
      const activeId = createRes.json().id;

      const archiveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'To Archive' },
      });
      const archiveId = archiveRes.json().id;

      // Archive one project
      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${archiveId}`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'archived' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(activeId);
    });

    it('should support pagination with cursor', async () => {
      const user = await createTestUser(app);

      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/projects',
          headers: authHeaders(user.accessToken),
          payload: { name: `Project ${i}` },
        });
      }

      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/projects?pageSize=2',
        headers: authHeaders(user.accessToken),
      });

      const body1 = res1.json();
      expect(body1.data).toHaveLength(2);
      expect(body1.meta.hasMore).toBe(true);
      expect(body1.meta.nextCursor).toBeDefined();

      const res2 = await app.inject({
        method: 'GET',
        url: `/api/v1/projects?pageSize=2&cursor=${body1.meta.nextCursor}`,
        headers: authHeaders(user.accessToken),
      });

      const body2 = res2.json();
      expect(body2.data).toHaveLength(2);
      // Different projects than page 1
      expect(body2.data[0].id).not.toBe(body1.data[0].id);
      expect(body2.data[0].id).not.toBe(body1.data[1].id);
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GET BY ID ====================

  describe('GET /api/v1/projects/:projectId', () => {
    it('should return a project by ID', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Test Project', description: 'Test desc', frameworkPreference: 'togaf' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(projectId);
      expect(body.name).toBe('Test Project');
      expect(body.description).toBe('Test desc');
      expect(body.frameworkPreference).toBe('togaf');
    });

    it('should return 404 for non-existent project', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE ====================

  describe('PUT /api/v1/projects/:projectId', () => {
    // AC-05.3: Rename, update description, change framework preference
    it('should update project name (AC-05.3)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Original Name' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { name: 'Updated Name' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.name).toBe('Updated Name');
    });

    it('should support partial updates (only description)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Unchanged Name', frameworkPreference: 'c4' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { description: 'New description' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.name).toBe('Unchanged Name');
      expect(body.description).toBe('New description');
      expect(body.frameworkPreference).toBe('c4');
    });

    it('should update framework preference', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Framework Test', frameworkPreference: 'c4' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { frameworkPreference: 'archimate' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().frameworkPreference).toBe('archimate');
    });

    it('should return 403 for non-owner', async () => {
      const owner = await createTestUser(app);
      const other = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(owner.accessToken),
        payload: { name: 'Owner Project' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(other.accessToken),
        payload: { name: 'Hijacked' },
      });

      // Other user can't even find it (different workspace)
      expect([403, 404]).toContain(res.statusCode);
    });

    it('should return 404 for non-existent project', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Ghost' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ARCHIVE / RESTORE ====================

  describe('Archive and Restore', () => {
    // AC-05.4: Archive project
    it('should archive a project (AC-05.4)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'To Archive' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'archived' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('archived');
      expect(body.archivedAt).not.toBeNull();
    });

    it('should filter archived projects via status query', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Archived Project' },
      });
      const projectId = createRes.json().id;

      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'archived' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects?status=archived',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('archived');
    });

    // AC-05.5: Restore archived project
    it('should restore an archived project (AC-05.5)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Restore Me' },
      });
      const projectId = createRes.json().id;

      // Archive
      await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'archived' },
      });

      // Restore
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'active' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('active');
      expect(body.archivedAt).toBeNull();
    });
  });

  // ==================== DELETE ====================

  describe('DELETE /api/v1/projects/:projectId', () => {
    // AC-05.6: Delete with name confirmation
    it('should delete project with correct name confirmation (AC-05.6)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Delete Me' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { confirmName: 'Delete Me' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toBe('Project deleted permanently.');

      // Verify it's gone
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 400 for wrong name confirmation', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Correct Name' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { confirmName: 'Wrong Name' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent project', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(user.accessToken),
        payload: { confirmName: 'Ghost' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should cascade delete artifacts when project is deleted', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'With Artifacts' },
      });
      const projectId = createRes.json().id;

      // Manually create an artifact for the project
      const prisma = getPrisma();
      await prisma.artifact.create({
        data: {
          projectId,
          createdBy: user.id,
          name: 'Test Artifact',
          type: 'c4_container',
          framework: 'c4',
        },
      });

      // Verify artifact exists
      const artifacts = await prisma.artifact.findMany({
        where: { projectId },
      });
      expect(artifacts).toHaveLength(1);

      // Delete project
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { confirmName: 'With Artifacts' },
      });

      // Verify artifacts are cascade-deleted
      const remaining = await prisma.artifact.findMany({
        where: { projectId },
      });
      expect(remaining).toHaveLength(0);
    });
  });

  // ==================== SEARCH ====================

  describe('Search', () => {
    // AC-05.7: Search projects by name
    it('should filter projects by search term (AC-05.7)', async () => {
      const user = await createTestUser(app);

      for (const name of ['Cloud Migration', 'Cloud Security', 'Data Platform']) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/projects',
          headers: authHeaders(user.accessToken),
          payload: { name },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects?search=cloud',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.data.every((p: { name: string }) => p.name.toLowerCase().includes('cloud'))).toBe(true);
    });

    it('should return empty results for non-matching search', async () => {
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Real Project' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects?search=nonexistent',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
    });

    it('should be case-insensitive', async () => {
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Cloud Migration' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects?search=CLOUD',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });
  });

  // ==================== AUDIT LOGGING ====================

  describe('Audit logging', () => {
    it('should log project create event', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Audited Project' },
      });
      const projectId = res.json().id;

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: {
          resourceId: projectId,
          action: 'project.create',
        },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(user.id);
      expect(logs[0].resourceType).toBe('project');
    });

    it('should log project delete event', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'To Delete' },
      });
      const projectId = createRes.json().id;

      await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}`,
        headers: authHeaders(user.accessToken),
        payload: { confirmName: 'To Delete' },
      });

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: {
          resourceId: projectId,
          action: 'project.delete',
        },
      });

      expect(logs).toHaveLength(1);
    });
  });

  // ==================== WORKSPACE ISOLATION ====================

  describe('Workspace isolation', () => {
    it('should not show projects from another user workspace', async () => {
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user1.accessToken),
        payload: { name: 'User 1 Project' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(0);
    });
  });

  // ==================== MEMBERS ====================

  describe('GET /api/v1/projects/:projectId/members', () => {
    it('should list project members (owner auto-added)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Team Project' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].user.id).toBe(user.id);
      expect(body.data[0].role).toBe('owner');
    });

    it('should return 404 for non-existent project', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000/members',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000/members',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/members', () => {
    it('should add a member to the project', async () => {
      const owner = await createTestUser(app);
      const member = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(owner.accessToken),
        payload: { name: 'Collaborative Project' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(owner.accessToken),
        payload: { email: member.email, role: 'editor' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.user.id).toBe(member.id);
      expect(body.role).toBe('editor');
    });

    it('should return 409 for duplicate member', async () => {
      const owner = await createTestUser(app);
      const member = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(owner.accessToken),
        payload: { name: 'Dup Test' },
      });
      const projectId = createRes.json().id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(owner.accessToken),
        payload: { email: member.email, role: 'editor' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(owner.accessToken),
        payload: { email: member.email, role: 'viewer' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should return 400 for invalid role', async () => {
      const owner = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(owner.accessToken),
        payload: { name: 'Role Test' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(owner.accessToken),
        payload: { email: 'someone@test.com', role: 'superadmin' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent user email', async () => {
      const owner = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(owner.accessToken),
        payload: { name: 'Ghost Member Test' },
      });
      const projectId = createRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/members`,
        headers: authHeaders(owner.accessToken),
        payload: { email: 'nonexistent@test.com', role: 'editor' },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
