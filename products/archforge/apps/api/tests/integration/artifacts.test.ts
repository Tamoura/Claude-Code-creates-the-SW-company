/**
 * Artifact endpoint integration tests
 *
 * Tests AI generation (mocked), manual CRUD, elements, relationships,
 * canvas save, versioning, authentication, workspace isolation,
 * audit logging, and error cases.
 * Traces to US-03, US-06, US-08.
 */

import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  getPrisma,
  TestUser,
} from '../helpers';

// Mock AI response for C4 context diagram
const mockC4Response = {
  name: 'E-Commerce System Context',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'c4_person',
      name: 'Customer',
      description: 'A user who buys products',
      properties: {},
      position: { x: 100, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'c4_system',
      name: 'E-Commerce Platform',
      description: 'The main shopping system',
      properties: {},
      position: { x: 100, y: 200, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-3',
      elementType: 'c4_database',
      name: 'Product Database',
      description: 'Stores product catalog',
      properties: {},
      position: { x: 100, y: 400, width: 200, height: 100 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-1',
      targetElementId: 'el-2',
      relationshipType: 'uses',
      label: 'Browses and purchases',
    },
    {
      relationshipId: 'rel-2',
      sourceElementId: 'el-2',
      targetElementId: 'el-3',
      relationshipType: 'reads_from',
      label: 'Reads product data',
    },
  ],
  mermaidDiagram:
    'graph TD\n  A(("Customer")) -->|Browses and purchases| B["E-Commerce Platform"]\n  B -->|Reads product data| C[("Product Database")]',
};

// Mock AI response for ArchiMate layered diagram
const mockArchimateResponse = {
  name: 'Banking Application Landscape',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'archimate_business_process',
      name: 'Loan Processing',
      description: 'Handles loan applications',
      properties: {},
      position: { x: 100, y: 0, width: 200, height: 100 },
      layer: 'business',
    },
    {
      elementId: 'el-2',
      elementType: 'archimate_application_component',
      name: 'Loan Management System',
      description: 'Core loan application',
      properties: {},
      position: { x: 100, y: 200, width: 200, height: 100 },
      layer: 'application',
    },
    {
      elementId: 'el-3',
      elementType: 'archimate_technology_node',
      name: 'Application Server',
      description: 'Hosts the loan system',
      properties: {},
      position: { x: 100, y: 400, width: 200, height: 100 },
      layer: 'technology',
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-2',
      targetElementId: 'el-1',
      relationshipType: 'serves',
      label: 'Supports',
    },
    {
      relationshipId: 'rel-2',
      sourceElementId: 'el-3',
      targetElementId: 'el-2',
      relationshipType: 'serves',
      label: 'Hosts',
    },
  ],
  mermaidDiagram:
    'graph TD\n  A["Loan Processing"] --- B["Loan Management System"]\n  B --- C["Application Server"]',
};

// Mock for regeneration (different content)
const mockRegenResponse = {
  name: 'Updated E-Commerce Context',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'c4_person',
      name: 'Admin User',
      description: 'Platform administrator',
      properties: {},
      position: { x: 0, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'c4_system',
      name: 'Admin Dashboard',
      description: 'Management interface',
      properties: {},
      position: { x: 0, y: 200, width: 200, height: 100 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-1',
      targetElementId: 'el-2',
      relationshipType: 'uses',
      label: 'Manages',
    },
  ],
  mermaidDiagram:
    'graph TD\n  A(("Admin User")) -->|Manages| B["Admin Dashboard"]',
};

describe('Artifact endpoints', () => {
  let app: FastifyInstance;
  const originalMock = process.env.AI_MOCK_RESPONSE;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    process.env.AI_MOCK_RESPONSE = originalMock;
    await cleanDatabase();
    await closeApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // Helper: create a project and return its ID
  async function createProject(
    token: string,
    name = 'Test Architecture',
  ): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeaders(token),
      payload: {
        name,
        frameworkPreference: 'c4',
      },
    });
    return res.json().id;
  }

  // Helper: generate a C4 artifact (mock)
  async function generateArtifact(
    token: string,
    projectId: string,
  ): Promise<string> {
    process.env.AI_MOCK_RESPONSE = JSON.stringify(mockC4Response);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts/generate`,
      headers: authHeaders(token),
      payload: {
        prompt:
          'Generate a C4 context diagram for an e-commerce platform',
        type: 'c4_context',
        framework: 'c4',
      },
    });
    return res.json().id;
  }

  // Helper: create a manual artifact
  async function createManualArtifact(
    token: string,
    projectId: string,
    name = 'Test Artifact',
  ): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts`,
      headers: authHeaders(token),
      payload: {
        name,
        type: 'c4_context',
        framework: 'c4',
      },
    });
    return res.json().id;
  }

  // ==================== GENERATE ====================

  describe('POST /projects/:projectId/artifacts/generate', () => {
    it('should generate a C4 context diagram (201)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt:
            'Generate a C4 context diagram for an e-commerce platform',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('E-Commerce System Context');
      expect(body.type).toBe('c4_context');
      expect(body.framework).toBe('c4');
      expect(body.status).toBe('draft');
      expect(body.currentVersion).toBe(1);
      expect(body.elements).toHaveLength(3);
      expect(body.relationships).toHaveLength(2);
      expect(body.svgContent).toContain('graph TD');
      expect(body.createdBy.id).toBe(user.id);
    });

    it('should generate an ArchiMate layered diagram (201)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      process.env.AI_MOCK_RESPONSE = JSON.stringify(
        mockArchimateResponse,
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt:
            'Generate an ArchiMate layered diagram for a banking system',
          type: 'archimate_layered',
          framework: 'archimate',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.name).toBe('Banking Application Landscape');
      expect(body.framework).toBe('archimate');
      expect(body.elements).toHaveLength(3);
      expect(body.elements[0].layer).toBe('business');
      expect(body.elements[1].layer).toBe('application');
      expect(body.elements[2].layer).toBe('technology');
    });

    it('should return 400 for invalid framework', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Generate something with a bad framework',
          type: 'c4_context',
          framework: 'invalid_framework',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid type', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Generate something with a bad type',
          type: 'invalid_type',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for mismatched framework/type', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Generate a mismatched diagram',
          type: 'archimate_layered',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000/artifacts/generate',
        payload: {
          prompt: 'Generate a diagram without authentication',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const user = await createTestUser(app);

      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000/artifacts/generate',
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Generate diagram for ghost project',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should create artifact version on generation', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Check version creation',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      const artifactId = res.json().id;
      const prisma = getPrisma();
      const versions = await prisma.artifactVersion.findMany({
        where: { artifactId },
      });

      expect(versions).toHaveLength(1);
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[0].changeType).toBe('ai_generation');
    });
  });

  // ==================== CREATE (manual) ====================

  describe('POST /api/v1/projects/:projectId/artifacts', () => {
    it('should create an artifact manually', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'c4_context', framework: 'c4' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid framework', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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
        url: `/api/v1/projects/00000000-0000-0000-0000-000000000000/artifacts`,
        payload: {
          name: 'No Auth',
          type: 'c4_context',
          framework: 'c4',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-member project', async () => {
      const user = await createTestUser(app);
      const other = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== LIST ====================

  describe('GET /projects/:projectId/artifacts', () => {
    it('should list artifacts (200)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      // Generate two artifacts
      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'First diagram for listing',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Second diagram for listing',
          type: 'c4_context',
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
      expect(body.data[0].elementCount).toBe(3);
    });

    it('should support pagination', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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

    it('should return empty list when no artifacts exist', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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

  describe('GET /projects/:projectId/artifacts/:artifactId', () => {
    it('should return artifact with elements and relationships (200)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await generateArtifact(
        user.accessToken,
        projectId,
      );

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(artifactId);
      expect(body.elements).toHaveLength(3);
      expect(body.relationships).toHaveLength(2);
      expect(body.elements[0].elementType).toBe('c4_person');
    });

    it('should return artifact by ID (manual)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await createManualArtifact(
        user.accessToken,
        projectId,
        'Lookup Test',
      );

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Lookup Test');
    });

    it('should return 404 for non-existent artifact', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE ====================

  describe('PUT /projects/:projectId/artifacts/:artifactId', () => {
    it('should update artifact name (200)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await generateArtifact(
        user.accessToken,
        projectId,
      );

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
        payload: { name: 'Renamed Artifact' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Renamed Artifact');
    });

    it('should auto-version when canvasData changes', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await createManualArtifact(
        user.accessToken,
        projectId,
        'Versioned',
      );

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
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await createManualArtifact(
        user.accessToken,
        projectId,
        'Status Test',
      );

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
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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

  describe('DELETE /projects/:projectId/artifacts/:artifactId', () => {
    it('should delete artifact (200)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await generateArtifact(
        user.accessToken,
        projectId,
      );

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toBe('Artifact deleted.');

      // Verify gone
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
        headers: authHeaders(user.accessToken),
      });
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent artifact', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== REGENERATE ====================

  describe('POST /projects/:projectId/artifacts/:artifactId/regenerate', () => {
    it('should regenerate artifact with new version (201)', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      // Generate initial artifact
      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);
      const genRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Initial diagram for regeneration test',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = genRes.json().id;

      // Regenerate with different mock
      process.env.AI_MOCK_RESPONSE = JSON.stringify(
        mockRegenResponse,
      );
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/regenerate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt:
            'Regenerate with admin dashboard focus',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.name).toBe('Updated E-Commerce Context');
      expect(body.currentVersion).toBe(2);
      expect(body.elements).toHaveLength(2);
      expect(body.relationships).toHaveLength(1);

      // Verify version created
      const prisma = getPrisma();
      const versions = await prisma.artifactVersion.findMany({
        where: { artifactId },
        orderBy: { versionNumber: 'asc' },
      });
      expect(versions).toHaveLength(2);
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[1].versionNumber).toBe(2);
    });

    it('should return 404 for non-existent artifact', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000/regenerate`,
        headers: authHeaders(user.accessToken),
        payload: { prompt: 'Regenerate ghost artifact' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ELEMENTS ====================

  describe('Elements CRUD', () => {
    let user: TestUser;
    let projectId: string;
    let artifactId: string;

    beforeEach(async () => {
      user = await createTestUser(app);
      projectId = await createProject(user.accessToken);
      artifactId = await createManualArtifact(
        user.accessToken,
        projectId,
        'Element Test',
      );
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
    let user: TestUser;
    let projectId: string;
    let artifactId: string;

    beforeEach(async () => {
      user = await createTestUser(app);
      projectId = await createProject(user.accessToken);
      artifactId = await createManualArtifact(
        user.accessToken,
        projectId,
        'Rel Test',
      );
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
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);
      const artifactId = await createManualArtifact(
        user.accessToken,
        projectId,
        'Canvas Test',
      );

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
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000/canvas`,
        headers: authHeaders(user.accessToken),
        payload: { canvasData: {} },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== WORKSPACE ISOLATION ====================

  describe('Workspace isolation', () => {
    it("should not access another user's artifacts", async () => {
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);
      const projectId = await createProject(
        user1.accessToken,
      );
      await generateArtifact(user1.accessToken, projectId);

      // user2 tries to list user1's artifacts
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/artifacts`,
        headers: authHeaders(user2.accessToken),
      });

      // user2 can't even find the project (different workspace)
      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== AUDIT LOGGING ====================

  describe('Audit logging', () => {
    it('should log artifact.generate event', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

      process.env.AI_MOCK_RESPONSE =
        JSON.stringify(mockC4Response);
      const genRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          prompt: 'Audit test diagram',
          type: 'c4_context',
          framework: 'c4',
        },
      });
      const artifactId = genRes.json().id;

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: {
          resourceId: artifactId,
          action: 'artifact.generate',
        },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(user.id);
      expect(logs[0].resourceType).toBe('artifact');
    });

    it('should log artifact.create event', async () => {
      const user = await createTestUser(app);
      const projectId = await createProject(user.accessToken);

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

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { resourceId: artifactId, action: 'artifact.create' },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(user.id);
    });
  });
});
