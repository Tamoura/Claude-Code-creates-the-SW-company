/**
 * Framework Validation Integration Tests
 *
 * Tests for POST /:projectId/artifacts/:artifactId/validate
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

// Valid C4 context mock with persons, systems, descriptions, labels
const VALID_C4_MOCK = JSON.stringify({
  name: 'Valid C4 Context',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'c4_person',
      name: 'End User',
      description: 'Uses the application',
      properties: {},
      position: { x: 0, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'c4_system',
      name: 'Main System',
      description: 'Core application system',
      properties: {},
      position: { x: 300, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-3',
      elementType: 'c4_external_system',
      name: 'Email Service',
      description: 'Sends emails to users',
      properties: {},
      position: { x: 600, y: 0, width: 200, height: 100 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-1',
      targetElementId: 'el-2',
      relationshipType: 'uses',
      label: 'Uses application',
    },
    {
      relationshipId: 'rel-2',
      sourceElementId: 'el-2',
      targetElementId: 'el-3',
      relationshipType: 'sends_data',
      label: 'Sends notifications',
    },
  ],
  mermaidDiagram: 'graph TD\n  A[End User] -->|Uses| B[Main System]\n  B -->|Sends| C[Email Service]',
});

// C4 mock missing descriptions
const MISSING_DESC_C4_MOCK = JSON.stringify({
  name: 'Missing Descriptions C4',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'c4_person',
      name: 'User',
      description: '',
      properties: {},
      position: { x: 0, y: 0, width: 200, height: 100 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'c4_system',
      name: 'System',
      description: '',
      properties: {},
      position: { x: 300, y: 0, width: 200, height: 100 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-1',
      targetElementId: 'el-2',
      relationshipType: 'uses',
      label: '',
    },
  ],
  mermaidDiagram: 'graph TD\n  A[User] --> B[System]',
});

// ArchiMate mock
const ARCHIMATE_MOCK = JSON.stringify({
  name: 'ArchiMate Layered',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'archimate_business_process',
      name: 'Order Processing',
      description: 'Handles customer orders',
      properties: {},
      position: { x: 0, y: 0, width: 200, height: 100 },
      layer: 'business',
    },
    {
      elementId: 'el-2',
      elementType: 'archimate_application_component',
      name: 'Order Service',
      description: 'Application that processes orders',
      properties: {},
      position: { x: 0, y: 200, width: 200, height: 100 },
      layer: 'application',
    },
    {
      elementId: 'el-3',
      elementType: 'archimate_technology_node',
      name: 'App Server',
      description: 'Hosts the order service',
      properties: {},
      position: { x: 0, y: 400, width: 200, height: 100 },
      layer: 'technology',
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-2',
      targetElementId: 'el-1',
      relationshipType: 'serving',
      label: 'Serves',
    },
    {
      relationshipId: 'rel-2',
      sourceElementId: 'el-3',
      targetElementId: 'el-2',
      relationshipType: 'realization',
      label: 'Realizes',
    },
  ],
  mermaidDiagram: 'graph TD',
});

// BPMN mock
const BPMN_MOCK = JSON.stringify({
  name: 'Order Process',
  elements: [
    {
      elementId: 'el-1',
      elementType: 'bpmn_start_event',
      name: 'Order Received',
      description: 'Process starts when order is received',
      properties: {},
      position: { x: 0, y: 0, width: 50, height: 50 },
      layer: null,
    },
    {
      elementId: 'el-2',
      elementType: 'bpmn_task',
      name: 'Review Order',
      description: 'Review the incoming order',
      properties: {},
      position: { x: 100, y: 0, width: 150, height: 80 },
      layer: null,
    },
    {
      elementId: 'el-3',
      elementType: 'bpmn_exclusive_gateway',
      name: 'Approved?',
      description: 'Decision: is order approved?',
      properties: {},
      position: { x: 300, y: 0, width: 50, height: 50 },
      layer: null,
    },
    {
      elementId: 'el-4',
      elementType: 'bpmn_task',
      name: 'Process Order',
      description: 'Process the approved order',
      properties: {},
      position: { x: 400, y: -50, width: 150, height: 80 },
      layer: null,
    },
    {
      elementId: 'el-5',
      elementType: 'bpmn_task',
      name: 'Reject Order',
      description: 'Reject the order',
      properties: {},
      position: { x: 400, y: 50, width: 150, height: 80 },
      layer: null,
    },
    {
      elementId: 'el-6',
      elementType: 'bpmn_end_event',
      name: 'Order Complete',
      description: 'Process ends',
      properties: {},
      position: { x: 600, y: 0, width: 50, height: 50 },
      layer: null,
    },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      sourceElementId: 'el-1',
      targetElementId: 'el-2',
      relationshipType: 'sequence_flow',
      label: null,
    },
    {
      relationshipId: 'rel-2',
      sourceElementId: 'el-2',
      targetElementId: 'el-3',
      relationshipType: 'sequence_flow',
      label: null,
    },
    {
      relationshipId: 'rel-3',
      sourceElementId: 'el-3',
      targetElementId: 'el-4',
      relationshipType: 'sequence_flow',
      label: 'Yes',
    },
    {
      relationshipId: 'rel-4',
      sourceElementId: 'el-3',
      targetElementId: 'el-5',
      relationshipType: 'sequence_flow',
      label: 'No',
    },
    {
      relationshipId: 'rel-5',
      sourceElementId: 'el-4',
      targetElementId: 'el-6',
      relationshipType: 'sequence_flow',
      label: null,
    },
    {
      relationshipId: 'rel-6',
      sourceElementId: 'el-5',
      targetElementId: 'el-6',
      relationshipType: 'sequence_flow',
      label: null,
    },
  ],
  mermaidDiagram: 'graph LR',
});

// Empty artifact mock (no elements, no relationships)
const EMPTY_MOCK = JSON.stringify({
  name: 'Empty Artifact',
  elements: [],
  relationships: [],
  mermaidDiagram: '',
});

async function createArtifactWithMock(
  mockResponse: string,
  framework: string,
  type: string,
): Promise<string> {
  const origMock = process.env.AI_MOCK_RESPONSE;
  process.env.AI_MOCK_RESPONSE = mockResponse;

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/projects/${projectId}/artifacts/generate`,
    headers: authHeaders(user.accessToken),
    payload: {
      prompt: 'Generate a test artifact for validation testing purposes with enough detail',
      type,
      framework,
    },
  });

  process.env.AI_MOCK_RESPONSE = origMock;

  if (res.statusCode !== 201) {
    throw new Error(`Failed to create artifact: ${res.statusCode} ${res.body}`);
  }

  return res.json().id;
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.AI_MOCK_RESPONSE = VALID_C4_MOCK;
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);

  // Create a project
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: authHeaders(user.accessToken),
    payload: {
      name: 'Validation Test Project',
      description: 'Project for validation tests',
    },
  });
  projectId = res.json().id;
});

afterAll(async () => {
  delete process.env.AI_MOCK_RESPONSE;
  await cleanDatabase();
  await closeApp();
});

describe('Framework Validation (US-10)', () => {
  describe('C4 validation', () => {
    it('should validate a valid C4 artifact — score > 60', async () => {
      const artifactId = await createArtifactWithMock(
        VALID_C4_MOCK,
        'c4',
        'c4_context',
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.score).toBeGreaterThan(60);
      expect(body.framework).toBe('c4');
      expect(body.grade).toBeDefined();
      expect(['A', 'B', 'C', 'D', 'F']).toContain(body.grade);
      expect(body.rules).toBeDefined();
      expect(Array.isArray(body.rules)).toBe(true);
      expect(body.suggestions).toBeDefined();
    });

    it('should produce lower score for C4 artifact with missing descriptions', async () => {
      const artifactId = await createArtifactWithMock(
        MISSING_DESC_C4_MOCK,
        'c4',
        'c4_context',
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Should be lower than perfect because of missing descriptions and labels
      expect(body.score).toBeLessThan(100);
      expect(body.rules.some((r: { status: string }) => r.status === 'fail')).toBe(true);
      expect(body.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('ArchiMate validation', () => {
    it('should validate an ArchiMate artifact', async () => {
      const artifactId = await createArtifactWithMock(
        ARCHIMATE_MOCK,
        'archimate',
        'archimate_layered',
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.framework).toBe('archimate');
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.rules.length).toBeGreaterThan(0);
    });
  });

  describe('BPMN validation', () => {
    it('should validate a BPMN artifact', async () => {
      const artifactId = await createArtifactWithMock(
        BPMN_MOCK,
        'bpmn',
        'bpmn_process',
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.framework).toBe('bpmn');
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.rules.length).toBeGreaterThan(0);
      // Valid BPMN should pass most rules
      const passedRules = body.rules.filter(
        (r: { status: string }) => r.status === 'pass',
      );
      expect(passedRules.length).toBeGreaterThan(0);
    });
  });

  describe('Error cases', () => {
    it('should return 404 for non-existent artifact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${fakeId}/validate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const artifactId = await createArtifactWithMock(
        VALID_C4_MOCK,
        'c4',
        'c4_context',
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
        payload: {},
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Grade calculation', () => {
    it('should calculate correct grades based on score', () => {
      // Import directly for unit-level test
      const { ValidationService } = require('../../src/modules/validation/validation.service');

      expect(ValidationService.calculateGrade(95)).toBe('A');
      expect(ValidationService.calculateGrade(90)).toBe('A');
      expect(ValidationService.calculateGrade(85)).toBe('B');
      expect(ValidationService.calculateGrade(80)).toBe('B');
      expect(ValidationService.calculateGrade(75)).toBe('C');
      expect(ValidationService.calculateGrade(70)).toBe('C');
      expect(ValidationService.calculateGrade(65)).toBe('D');
      expect(ValidationService.calculateGrade(60)).toBe('D');
      expect(ValidationService.calculateGrade(50)).toBe('F');
      expect(ValidationService.calculateGrade(0)).toBe('F');
    });
  });

  describe('Empty artifact', () => {
    it('should return score 0 for an empty artifact', async () => {
      const artifactId = await createArtifactWithMock(
        EMPTY_MOCK,
        'c4',
        'c4_context',
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.score).toBe(0);
      expect(body.grade).toBe('F');
      expect(body.suggestions.length).toBeGreaterThan(0);
    });
  });
});
