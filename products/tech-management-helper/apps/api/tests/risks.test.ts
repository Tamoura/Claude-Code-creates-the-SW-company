import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/jwt.js';
import { hashPassword } from '../src/lib/password.js';
import { FastifyInstance } from 'fastify';

// Test data constants - Unique IDs for risks test file
const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440020';
const TEST_USER_ID = '650e8400-e29b-41d4-a716-446655440021';
const TEST_MANAGER_ID = '650e8400-e29b-41d4-a716-446655440022';
const TEST_VIEWER_ID = '650e8400-e29b-41d4-a716-446655440023';

let app: FastifyInstance;
let analystToken: string;
let managerToken: string;
let viewerToken: string;

beforeAll(async () => {
  // Clean up any existing test data
  await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } }).catch(() => {});

  // Create test organization
  await prisma.organization.create({
    data: {
      id: TEST_ORG_ID,
      name: 'Test Organization Risks',
      slug: 'test-org-risks',
    },
  });

  // Create test users
  const hashedPassword = await hashPassword('Test123!@#');

  const analyst = await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'analyst-risks@test.com',
      passwordHash: hashedPassword,
      name: 'Test Analyst Risks',
      role: 'ANALYST',
      organizationId: TEST_ORG_ID,
    },
  });

  const manager = await prisma.user.create({
    data: {
      id: TEST_MANAGER_ID,
      email: 'manager-risks@test.com',
      passwordHash: hashedPassword,
      name: 'Test Manager Risks',
      role: 'MANAGER',
      organizationId: TEST_ORG_ID,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      id: TEST_VIEWER_ID,
      email: 'viewer-risks@test.com',
      passwordHash: hashedPassword,
      name: 'Test Viewer Risks',
      role: 'VIEWER',
      organizationId: TEST_ORG_ID,
    },
  });

  // Generate tokens
  analystToken = generateToken({ userId: analyst.id, email: analyst.email, role: analyst.role });
  managerToken = generateToken({ userId: manager.id, email: manager.email, role: manager.role });
  viewerToken = generateToken({ userId: viewer.id, email: viewer.email, role: viewer.role });

  // Build app
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  // Clean up test data
  await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } });
  await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });

  await app.close();
});

describe('Risk CRUD API', () => {
  describe('POST /api/v1/risks', () => {
    it('should create a risk with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          title: 'Database Breach Risk',
          description: 'Risk of unauthorized access to production database',
          category: 'Security',
          likelihood: 3,
          impact: 5,
          status: 'IDENTIFIED',
          mitigationPlan: 'Implement database encryption and access controls',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.risk).toBeDefined();
      expect(body.risk.title).toBe('Database Breach Risk');
      expect(body.risk.likelihood).toBe(3);
      expect(body.risk.impact).toBe(5);
      expect(body.risk.riskScore).toBe(15); // 3 × 5
      expect(body.risk.status).toBe('IDENTIFIED');
      expect(body.risk.mitigationPlan).toBe('Implement database encryption and access controls');
    });

    it('should auto-assign current user as owner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          title: 'Test Risk',
          description: 'Test',
          category: 'Operational',
          likelihood: 2,
          impact: 2,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.risk.ownerId).toBe(TEST_USER_ID);
    });

    it('should reject invalid likelihood (out of range)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          title: 'Test Risk',
          description: 'Test',
          category: 'Security',
          likelihood: 6, // Invalid: must be 1-5
          impact: 3,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          title: 'Test Risk',
          // Missing description, category, likelihood, impact
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should deny Viewer role from creating risks', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
        payload: {
          title: 'Test Risk',
          description: 'Test',
          category: 'Security',
          likelihood: 2,
          impact: 2,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/risks', () => {
    beforeAll(async () => {
      // Create test risks
      await prisma.risk.createMany({
        data: [
          {
            title: 'High Risk 1',
            description: 'Critical security risk',
            category: 'Security',
            likelihood: 5,
            impact: 5,
            status: 'IDENTIFIED',
            organizationId: TEST_ORG_ID,
            ownerId: TEST_USER_ID,
          },
          {
            title: 'Medium Risk 1',
            description: 'Operational risk',
            category: 'Operational',
            likelihood: 3,
            impact: 3,
            status: 'ASSESSED',
            organizationId: TEST_ORG_ID,
            ownerId: TEST_MANAGER_ID,
          },
          {
            title: 'Low Risk 1',
            description: 'Compliance risk',
            category: 'Compliance',
            likelihood: 1,
            impact: 2,
            status: 'MITIGATING',
            organizationId: TEST_ORG_ID,
            ownerId: TEST_USER_ID,
          },
          {
            title: 'Closed Risk',
            description: 'Resolved risk',
            category: 'Security',
            likelihood: 4,
            impact: 4,
            status: 'CLOSED',
            organizationId: TEST_ORG_ID,
            ownerId: TEST_USER_ID,
          },
        ],
      });
    });

    it('should list all risks for organization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risks).toBeDefined();
      expect(body.risks.length).toBeGreaterThanOrEqual(4);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBeGreaterThanOrEqual(4);
    });

    it('should calculate riskScore for each risk', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      const highRisk = body.risks.find((r: any) => r.title === 'High Risk 1');
      expect(highRisk.riskScore).toBe(25); // 5 × 5

      const mediumRisk = body.risks.find((r: any) => r.title === 'Medium Risk 1');
      expect(mediumRisk.riskScore).toBe(9); // 3 × 3

      const lowRisk = body.risks.find((r: any) => r.title === 'Low Risk 1');
      expect(lowRisk.riskScore).toBe(2); // 1 × 2
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks?status=CLOSED',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risks.every((r: any) => r.status === 'CLOSED')).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks?category=Security',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risks.every((r: any) => r.category === 'Security')).toBe(true);
    });

    it('should filter by score range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks?minScore=15&maxScore=25',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risks.every((r: any) => r.riskScore >= 15 && r.riskScore <= 25)).toBe(true);
    });

    it('should sort by riskScore descending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks?sort=riskScore&order=desc',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Check that risks are sorted by score descending
      for (let i = 0; i < body.risks.length - 1; i++) {
        expect(body.risks[i].riskScore).toBeGreaterThanOrEqual(body.risks[i + 1].riskScore);
      }
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks?page=1&limit=2',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risks.length).toBe(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(2);
      expect(body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should include owner information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const riskWithOwner = body.risks.find((r: any) => r.ownerId !== null);
      expect(riskWithOwner.owner).toBeDefined();
      expect(riskWithOwner.owner.name).toBeDefined();
      expect(riskWithOwner.owner.email).toBeDefined();
    });

    it('should allow Viewer role to list risks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/risks/:id', () => {
    let testRiskId: string;

    beforeAll(async () => {
      const risk = await prisma.risk.create({
        data: {
          title: 'Detail Test Risk',
          description: 'Risk for detail endpoint testing',
          category: 'Security',
          likelihood: 4,
          impact: 4,
          status: 'ASSESSED',
          mitigationPlan: 'Test mitigation plan',
          organizationId: TEST_ORG_ID,
          ownerId: TEST_USER_ID,
        },
      });
      testRiskId = risk.id;
    });

    it('should get single risk by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risk).toBeDefined();
      expect(body.risk.id).toBe(testRiskId);
      expect(body.risk.title).toBe('Detail Test Risk');
      expect(body.risk.riskScore).toBe(16); // 4 × 4
    });

    it('should include owner in single risk response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risk.owner).toBeDefined();
      expect(body.risk.owner.id).toBe(TEST_USER_ID);
      expect(body.risk.owner.name).toBe('Test Analyst Risks');
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for risk from different organization', async () => {
      // Create risk in different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: 'Other Organization',
          slug: 'other-org',
        },
      });

      const otherRisk = await prisma.risk.create({
        data: {
          title: 'Other Org Risk',
          description: 'Risk from another organization',
          category: 'Security',
          likelihood: 3,
          impact: 3,
          organizationId: otherOrg.id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risks/${otherRisk.id}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      // Clean up
      await prisma.risk.delete({ where: { id: otherRisk.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });
  });

  describe('PUT /api/v1/risks/:id', () => {
    let testRiskId: string;

    beforeAll(async () => {
      const risk = await prisma.risk.create({
        data: {
          title: 'Update Test Risk',
          description: 'Risk for update testing',
          category: 'Operational',
          likelihood: 2,
          impact: 3,
          status: 'IDENTIFIED',
          organizationId: TEST_ORG_ID,
          ownerId: TEST_USER_ID,
        },
      });
      testRiskId = risk.id;
    });

    it('should update risk with valid data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          title: 'Updated Risk Title',
          likelihood: 4,
          impact: 5,
          status: 'MITIGATING',
          mitigationPlan: 'Updated mitigation plan',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risk.title).toBe('Updated Risk Title');
      expect(body.risk.likelihood).toBe(4);
      expect(body.risk.impact).toBe(5);
      expect(body.risk.riskScore).toBe(20); // 4 × 5
      expect(body.risk.status).toBe('MITIGATING');
      expect(body.risk.mitigationPlan).toBe('Updated mitigation plan');
    });

    it('should allow partial updates', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          status: 'ACCEPTED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risk.status).toBe('ACCEPTED');
      expect(body.risk.title).toBe('Updated Risk Title'); // Unchanged from previous test
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          title: 'Updated',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny Viewer role from updating risks', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
        payload: {
          title: 'Unauthorized Update',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/risks/:id', () => {
    let testRiskId: string;

    beforeAll(async () => {
      const risk = await prisma.risk.create({
        data: {
          title: 'Delete Test Risk',
          description: 'Risk for delete testing',
          category: 'Security',
          likelihood: 3,
          impact: 3,
          organizationId: TEST_ORG_ID,
          ownerId: TEST_USER_ID,
        },
      });
      testRiskId = risk.id;
    });

    it('should delete risk', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${managerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify risk is deleted
      const risk = await prisma.risk.findUnique({ where: { id: testRiskId } });
      expect(risk).toBeNull();
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${managerToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny Analyst role from deleting risks', async () => {
      const risk = await prisma.risk.create({
        data: {
          title: 'Another Risk',
          description: 'Test',
          category: 'Security',
          likelihood: 2,
          impact: 2,
          organizationId: TEST_ORG_ID,
          ownerId: TEST_USER_ID,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${risk.id}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(403);

      // Clean up
      await prisma.risk.delete({ where: { id: risk.id } });
    });
  });
});
