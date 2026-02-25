/**
 * Template endpoint integration tests
 *
 * Tests template CRUD, listing (public + private),
 * instantiation into artifacts, and auth.
 */

import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  getPrisma,
} from '../helpers';

describe('Template endpoints', () => {
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

  const sampleTemplate = {
    name: 'C4 Microservice Template',
    description: 'A starter template for microservice architecture',
    category: 'application' as const,
    subcategory: 'microservices',
    framework: 'c4' as const,
    canvasData: {
      elements: [
        {
          elementId: 'el-1',
          name: 'API Gateway',
          type: 'c4_container',
        },
      ],
      relationships: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    isPublic: true,
  };

  // ==================== LIST ====================

  describe('GET /api/v1/templates', () => {
    it('should list public templates (200)', async () => {
      const user = await createTestUser(app);

      // Create a public template
      await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: sampleTemplate,
      });

      // Create a private template
      await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: {
          ...sampleTemplate,
          name: 'Private Template',
          isPublic: false,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      // User sees both: 1 public + 1 private (own)
      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBe(2);
    });

    it('should only show public templates to other users', async () => {
      const creator = await createTestUser(app);
      const viewer = await createTestUser(app);

      // Creator makes a public template
      await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(creator.accessToken),
        payload: sampleTemplate,
      });

      // Creator makes a private template
      await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(creator.accessToken),
        payload: {
          ...sampleTemplate,
          name: 'Secret Template',
          isPublic: false,
        },
      });

      // Viewer only sees public
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/templates',
        headers: authHeaders(viewer.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe(
        'C4 Microservice Template',
      );
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/templates',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== CREATE ====================

  describe('POST /api/v1/templates', () => {
    it('should create a template (201)', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: sampleTemplate,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('C4 Microservice Template');
      expect(body.category).toBe('application');
      expect(body.framework).toBe('c4');
      expect(body.isPublic).toBe(true);
      expect(body.usageCount).toBe(0);
      expect(body.createdBy.id).toBe(user.id);
    });

    it('should return 400 for missing name', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: {
          ...sampleTemplate,
          name: undefined,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        payload: sampleTemplate,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GET BY ID ====================

  describe('GET /api/v1/templates/:templateId', () => {
    it('should return a template by ID (200)', async () => {
      const user = await createTestUser(app);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: sampleTemplate,
      });
      const templateId = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/templates/${templateId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(templateId);
      expect(body.name).toBe('C4 Microservice Template');
    });

    it('should return 404 for non-existent template', async () => {
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/templates/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== INSTANTIATE ====================

  describe('POST /api/v1/templates/:templateId/instantiate', () => {
    it('should instantiate template into artifact (201)', async () => {
      const user = await createTestUser(app);

      // Create project
      const projRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Template Test Project' },
      });
      const projectId = projRes.json().id;

      // Create template
      const tmplRes = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: sampleTemplate,
      });
      const templateId = tmplRes.json().id;

      // Instantiate
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/templates/${templateId}/instantiate`,
        headers: authHeaders(user.accessToken),
        payload: {
          projectId,
          name: 'My Microservice Architecture',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('My Microservice Architecture');
      expect(body.projectId).toBe(projectId);
      expect(body.framework).toBe('c4');

      // Verify template usage count incremented
      const prisma = getPrisma();
      const tmpl = await prisma.template.findUnique({
        where: { id: templateId },
      });
      expect(tmpl?.usageCount).toBe(1);
    });

    it('should use default name from template', async () => {
      const user = await createTestUser(app);

      const projRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Default Name Project' },
      });
      const projectId = projRes.json().id;

      const tmplRes = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        headers: authHeaders(user.accessToken),
        payload: sampleTemplate,
      });
      const templateId = tmplRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/templates/${templateId}/instantiate`,
        headers: authHeaders(user.accessToken),
        payload: { projectId },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().name).toBe(
        'From template: C4 Microservice Template',
      );
    });

    it('should return 404 for non-existent template', async () => {
      const user = await createTestUser(app);

      const projRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Ghost Template Project' },
      });
      const projectId = projRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/templates/00000000-0000-0000-0000-000000000000/instantiate',
        headers: authHeaders(user.accessToken),
        payload: { projectId },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/templates/00000000-0000-0000-0000-000000000000/instantiate',
        payload: {
          projectId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
