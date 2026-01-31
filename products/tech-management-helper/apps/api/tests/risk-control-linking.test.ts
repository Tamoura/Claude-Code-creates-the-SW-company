import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/jwt.js';
import { hashPassword } from '../src/lib/password.js';
import { FastifyInstance } from 'fastify';

// Test data constants - Unique IDs for risk-control linking test file
const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440040';
const TEST_USER_ID = '650e8400-e29b-41d4-a716-446655440041';
const TEST_VIEWER_ID = '650e8400-e29b-41d4-a716-446655440043';

let app: FastifyInstance;
let analystToken: string;
let viewerToken: string;
let testRiskId: string;
let testControl1Id: string;
let testControl2Id: string;

beforeAll(async () => {
  // Clean up any existing test data
  await prisma.riskControl.deleteMany({ where: { risk: { organizationId: TEST_ORG_ID } } }).catch(() => {});
  await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.control.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } }).catch(() => {});

  // Create test organization
  await prisma.organization.create({
    data: {
      id: TEST_ORG_ID,
      name: 'Test Organization Risk Control',
      slug: 'test-org-risk-control',
    },
  });

  // Create test users
  const hashedPassword = await hashPassword('Test123!@#');

  const analyst = await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'analyst-control@test.com',
      passwordHash: hashedPassword,
      name: 'Test Analyst Control',
      role: 'ANALYST',
      organizationId: TEST_ORG_ID,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      id: TEST_VIEWER_ID,
      email: 'viewer-control@test.com',
      passwordHash: hashedPassword,
      name: 'Test Viewer Control',
      role: 'VIEWER',
      organizationId: TEST_ORG_ID,
    },
  });

  // Generate tokens
  analystToken = generateToken({ userId: analyst.id, email: analyst.email, role: analyst.role });
  viewerToken = generateToken({ userId: viewer.id, email: viewer.email, role: viewer.role });

  // Create test risk
  const risk = await prisma.risk.create({
    data: {
      title: 'Test Risk for Linking',
      description: 'Risk for testing control linking',
      category: 'Security',
      likelihood: 3,
      impact: 4,
      organizationId: TEST_ORG_ID,
      ownerId: TEST_USER_ID,
    },
  });
  testRiskId = risk.id;

  // Create test controls
  const control1 = await prisma.control.create({
    data: {
      code: 'AC-001',
      title: 'Access Control Policy',
      description: 'Implement access control policy',
      category: 'Access Control',
      status: 'IMPLEMENTED',
      organizationId: TEST_ORG_ID,
      ownerId: TEST_USER_ID,
    },
  });
  testControl1Id = control1.id;

  const control2 = await prisma.control.create({
    data: {
      code: 'AC-002',
      title: 'User Authentication',
      description: 'Implement multi-factor authentication',
      category: 'Access Control',
      status: 'PARTIALLY_IMPLEMENTED',
      organizationId: TEST_ORG_ID,
      ownerId: TEST_USER_ID,
    },
  });
  testControl2Id = control2.id;

  // Build app
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  // Clean up test data
  await prisma.riskControl.deleteMany({ where: { risk: { organizationId: TEST_ORG_ID } } });
  await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.control.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } });
  await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });

  await app.close();
});

describe('Risk-Control Linking API', () => {
  describe('POST /api/v1/risks/:id/controls', () => {
    it('should link a control to a risk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/controls`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          controlId: testControl1Id,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Control linked to risk successfully');

      // Verify link was created
      const link = await prisma.riskControl.findUnique({
        where: {
          riskId_controlId: {
            riskId: testRiskId,
            controlId: testControl1Id,
          },
        },
      });
      expect(link).not.toBeNull();
    });

    it('should prevent duplicate links', async () => {
      // First link (should succeed)
      await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/controls`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          controlId: testControl2Id,
        },
      });

      // Second link (should fail)
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/controls`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          controlId: testControl2Id,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000/controls',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          controlId: testControl1Id,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent control', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/controls`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          controlId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny Viewer role from linking', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/controls`,
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
        payload: {
          controlId: testControl1Id,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require controlId in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/controls`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/risks/:id/controls/:controlId', () => {
    beforeAll(async () => {
      // Ensure a link exists for deletion tests
      await prisma.riskControl.create({
        data: {
          riskId: testRiskId,
          controlId: testControl1Id,
        },
      }).catch(() => {}); // Ignore if already exists
    });

    it('should unlink a control from a risk', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}/controls/${testControl1Id}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Control unlinked from risk successfully');

      // Verify link was deleted
      const link = await prisma.riskControl.findUnique({
        where: {
          riskId_controlId: {
            riskId: testRiskId,
            controlId: testControl1Id,
          },
        },
      });
      expect(link).toBeNull();
    });

    it('should return 404 for non-existent link', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}/controls/${testControl1Id}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000/controls/test',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny Viewer role from unlinking', async () => {
      // Create a link first
      await prisma.riskControl.create({
        data: {
          riskId: testRiskId,
          controlId: testControl2Id,
        },
      }).catch(() => {});

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}/controls/${testControl2Id}`,
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
      });

      expect(response.statusCode).toBe(403);

      // Clean up
      await prisma.riskControl.delete({
        where: {
          riskId_controlId: {
            riskId: testRiskId,
            controlId: testControl2Id,
          },
        },
      }).catch(() => {});
    });
  });

  describe('GET /api/v1/risks/:id (with controls)', () => {
    beforeAll(async () => {
      // Clean up existing links
      await prisma.riskControl.deleteMany({
        where: { riskId: testRiskId },
      });

      // Create fresh links
      await prisma.riskControl.createMany({
        data: [
          { riskId: testRiskId, controlId: testControl1Id },
          { riskId: testRiskId, controlId: testControl2Id },
        ],
      });
    });

    it('should include linked controls in risk detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risk.controls).toBeDefined();
      expect(body.risk.controls.length).toBe(2);

      const control = body.risk.controls[0].control;
      expect(control).toHaveProperty('id');
      expect(control).toHaveProperty('code');
      expect(control).toHaveProperty('title');
      expect(control).toHaveProperty('status');
    });
  });
});
