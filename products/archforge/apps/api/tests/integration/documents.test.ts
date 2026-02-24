/**
 * Document Ingestion Integration Tests
 *
 * Tests for POST/GET document endpoints and AI extraction.
 */

import { FastifyInstance } from 'fastify';
import {
  getApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  closeApp,
  getPrisma,
  TestUser,
} from '../helpers';

let app: FastifyInstance;
let user: TestUser;
let projectId: string;

const MOCK_EXTRACTION = JSON.stringify({
  entities: [
    { name: 'API Gateway', type: 'service', description: 'Main entry point' },
    { name: 'UserDB', type: 'database', description: 'User data store' },
  ],
  relationships: [
    {
      source: 'API Gateway',
      target: 'UserDB',
      type: 'uses',
      description: 'Reads user data',
    },
  ],
  technologies: ['PostgreSQL', 'Node.js'],
  patterns: ['microservices', 'api-gateway'],
});

const MOCK_ARTIFACT_RESPONSE = JSON.stringify({
  name: 'Generated Architecture',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'c4_system',
      name: 'API Gateway',
      description: 'Main entry point',
      properties: {},
      position: { x: 0, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'c4_person',
      name: 'User',
      description: 'End user',
      properties: {},
      position: { x: 300, y: 0, width: 200, height: 100 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-2',
      targetElementId: 'el-1',
      relationshipType: 'uses',
      label: 'Uses API',
    },
  ],
  mermaidDiagram: 'graph TD\n  A[User] -->|Uses API| B[API Gateway]',
});

beforeAll(async () => {
  process.env.AI_MOCK_RESPONSE = MOCK_EXTRACTION;
  process.env.NODE_ENV = 'test';
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);

  // Create a project for the tests
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: authHeaders(user.accessToken),
    payload: {
      name: 'Doc Test Project',
      description: 'Project for document tests',
    },
  });
  projectId = res.json().id;
});

afterAll(async () => {
  delete process.env.AI_MOCK_RESPONSE;
  await cleanDatabase();
  await closeApp();
});

describe('Document Ingestion (US-02)', () => {
  let documentId: string;

  describe('POST /:projectId/documents', () => {
    it('should upload a document and extract concepts — 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/documents`,
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Our system uses an API Gateway that connects to PostgreSQL for user data.',
          filename: 'architecture.md',
          fileType: 'markdown',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.originalFilename).toBe('architecture.md');
      expect(body.fileType).toBe('markdown');
      expect(body.processingStatus).toBe('processed');
      expect(body.extractionResult).toBeDefined();
      expect(body.extractionResult.entities).toHaveLength(2);
      expect(body.extractionResult.technologies).toContain('PostgreSQL');
      expect(body.uploadedBy.id).toBe(user.id);

      documentId = body.id;
    });

    it('should return 400 for empty content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/documents`,
        headers: authHeaders(user.accessToken),
        payload: {
          content: '',
          filename: 'empty.md',
          fileType: 'markdown',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/documents`,
        payload: {
          content: 'Some content',
          filename: 'test.md',
          fileType: 'markdown',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${fakeId}/documents`,
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Some content',
          filename: 'test.md',
          fileType: 'markdown',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /:projectId/documents', () => {
    it('should list documents for a project — 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/documents`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /:projectId/documents/:documentId', () => {
    it('should get a document with extraction result — 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/documents/${documentId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(documentId);
      expect(body.extractionResult).toBeDefined();
      expect(body.extractionResult.entities).toHaveLength(2);
      expect(body.extractionResult.relationships).toHaveLength(1);
      expect(body.extractionResult.patterns).toContain('microservices');
    });
  });

  describe('POST /:projectId/documents/:documentId/generate', () => {
    it('should generate an artifact from extracted concepts — 201', async () => {
      // Switch AI mock to artifact generation format
      const originalMock = process.env.AI_MOCK_RESPONSE;
      process.env.AI_MOCK_RESPONSE = MOCK_ARTIFACT_RESPONSE;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/documents/${documentId}/generate`,
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'c4_context',
          framework: 'c4',
        },
      });

      // Restore mock
      process.env.AI_MOCK_RESPONSE = originalMock;

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.framework).toBe('c4');
      expect(body.type).toBe('c4_context');
    });
  });

  describe('Workspace isolation', () => {
    it('should not allow access to documents from another workspace', async () => {
      // Create a second user with a different workspace
      const user2 = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/documents`,
        headers: authHeaders(user2.accessToken),
      });

      // Second user cannot access the first user's project
      expect(res.statusCode).toBe(404);
    });
  });
});
