/**
 * Export endpoint integration tests
 *
 * Tests artifact export in JSON, Mermaid, PlantUML formats,
 * plus auth and 404 handling.
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

// Mock AI response for generating test artifacts
const mockC4Response = {
  name: 'Export Test Diagram',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'c4_person',
      name: 'User',
      description: 'End user',
      properties: {},
      position: { x: 0, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'c4_system',
      name: 'Web App',
      description: 'Frontend application',
      properties: {},
      position: { x: 0, y: 200, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-3',
      elementType: 'c4_database',
      name: 'Database',
      description: 'Data store',
      properties: {},
      position: { x: 0, y: 400, width: 200, height: 100 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-1',
      targetElementId: 'el-2',
      relationshipType: 'uses',
      label: 'Interacts with',
    },
    {
      relationshipId: 'rel-2',
      sourceElementId: 'el-2',
      targetElementId: 'el-3',
      relationshipType: 'reads_from',
      label: 'Queries',
    },
  ],
  mermaidDiagram:
    'graph TD\n  A(("User")) -->|Interacts with| B["Web App"]\n  B -->|Queries| C[("Database")]',
};

describe('Export endpoints', () => {
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

  // Helper: create project + artifact
  async function createProjectAndArtifact(token: string): Promise<{
    projectId: string;
    artifactId: string;
  }> {
    const projRes = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeaders(token),
      payload: { name: 'Export Test Project' },
    });
    const projectId = projRes.json().id;

    process.env.AI_MOCK_RESPONSE =
      JSON.stringify(mockC4Response);
    const artRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts/generate`,
      headers: authHeaders(token),
      payload: {
        prompt:
          'Generate a diagram for export testing',
        type: 'c4_context',
        framework: 'c4',
      },
    });
    const artifactId = artRes.json().id;

    return { projectId, artifactId };
  }

  // ==================== JSON EXPORT ====================

  describe('POST /:projectId/artifacts/:artifactId/export', () => {
    it('should export artifact as JSON (200)', async () => {
      const user = await createTestUser(app);
      const { projectId, artifactId } =
        await createProjectAndArtifact(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/export`,
        headers: authHeaders(user.accessToken),
        payload: { format: 'json' },
      });

      expect(res.statusCode).toBe(200);
      expect(
        res.headers['content-type'],
      ).toContain('application/json');

      const content = JSON.parse(res.body);
      expect(content.name).toBe('Export Test Diagram');
      expect(content.elements).toHaveLength(3);
      expect(content.relationships).toHaveLength(2);
      expect(content.framework).toBe('c4');
    });

    // ==================== MERMAID EXPORT ====================

    it('should export artifact as Mermaid (200)', async () => {
      const user = await createTestUser(app);
      const { projectId, artifactId } =
        await createProjectAndArtifact(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/export`,
        headers: authHeaders(user.accessToken),
        payload: { format: 'mermaid' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('graph TD');
    });

    // ==================== PLANTUML EXPORT ====================

    it('should export artifact as PlantUML (200)', async () => {
      const user = await createTestUser(app);
      const { projectId, artifactId } =
        await createProjectAndArtifact(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/export`,
        headers: authHeaders(user.accessToken),
        payload: { format: 'plantuml' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('@startuml');
      expect(res.body).toContain('@enduml');
      expect(res.body).toContain('Export Test Diagram');
    });

    // ==================== 404 ====================

    it('should return 404 for non-existent artifact', async () => {
      const user = await createTestUser(app);
      const projRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeaders(user.accessToken),
        payload: { name: 'Export 404 Project' },
      });
      const projectId = projRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000/export`,
        headers: authHeaders(user.accessToken),
        payload: { format: 'json' },
      });

      expect(res.statusCode).toBe(404);
    });

    // ==================== AUTH ====================

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000000/artifacts/00000000-0000-0000-0000-000000000000/export',
        payload: { format: 'json' },
      });

      expect(res.statusCode).toBe(401);
    });

    // ==================== INVALID FORMAT ====================

    it('should return 400 for unsupported format', async () => {
      const user = await createTestUser(app);
      const { projectId, artifactId } =
        await createProjectAndArtifact(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/export`,
        headers: authHeaders(user.accessToken),
        payload: { format: 'pdf' },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
