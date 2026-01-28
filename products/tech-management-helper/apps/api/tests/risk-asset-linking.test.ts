import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/jwt.js';
import { hashPassword } from '../src/lib/password.js';
import { FastifyInstance } from 'fastify';

// Test data constants - Unique IDs for risk-asset linking test file
const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440030';
const TEST_USER_ID = '650e8400-e29b-41d4-a716-446655440031';
const TEST_VIEWER_ID = '650e8400-e29b-41d4-a716-446655440033';

let app: FastifyInstance;
let analystToken: string;
let viewerToken: string;
let testRiskId: string;
let testAsset1Id: string;
let testAsset2Id: string;

beforeAll(async () => {
  // Clean up any existing test data
  await prisma.riskAsset.deleteMany({ where: { risk: { organizationId: TEST_ORG_ID } } }).catch(() => {});
  await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.asset.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } }).catch(() => {});

  // Create test organization
  await prisma.organization.create({
    data: {
      id: TEST_ORG_ID,
      name: 'Test Organization Risk Asset',
      slug: 'test-org-risk-asset',
    },
  });

  // Create test users
  const hashedPassword = await hashPassword('Test123!@#');

  const analyst = await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'analyst-asset@test.com',
      passwordHash: hashedPassword,
      name: 'Test Analyst Asset',
      role: 'ANALYST',
      organizationId: TEST_ORG_ID,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      id: TEST_VIEWER_ID,
      email: 'viewer-asset@test.com',
      passwordHash: hashedPassword,
      name: 'Test Viewer Asset',
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
      title: 'Test Risk for Asset Linking',
      description: 'Risk for testing asset linking',
      category: 'Security',
      likelihood: 3,
      impact: 4,
      organizationId: TEST_ORG_ID,
      ownerId: TEST_USER_ID,
    },
  });
  testRiskId = risk.id;

  // Create test assets
  const asset1 = await prisma.asset.create({
    data: {
      name: 'Production Database Server',
      description: 'Main PostgreSQL database server',
      type: 'HARDWARE',
      status: 'ACTIVE',
      criticality: 'CRITICAL',
      location: 'Data Center A',
      organizationId: TEST_ORG_ID,
      ownerId: TEST_USER_ID,
    },
  });
  testAsset1Id = asset1.id;

  const asset2 = await prisma.asset.create({
    data: {
      name: 'Web Application Firewall',
      description: 'Primary WAF for external traffic',
      type: 'NETWORK',
      status: 'ACTIVE',
      criticality: 'HIGH',
      location: 'DMZ',
      organizationId: TEST_ORG_ID,
      ownerId: TEST_USER_ID,
    },
  });
  testAsset2Id = asset2.id;

  // Build app
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  // Clean up test data
  await prisma.riskAsset.deleteMany({ where: { risk: { organizationId: TEST_ORG_ID } } });
  await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.asset.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } });
  await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });

  await app.close();
});

describe('Risk-Asset Linking API', () => {
  describe('POST /api/v1/risks/:id/assets', () => {
    it('should link an asset to a risk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/assets`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          assetId: testAsset1Id,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Asset linked to risk successfully');

      // Verify link was created
      const link = await prisma.riskAsset.findUnique({
        where: {
          riskId_assetId: {
            riskId: testRiskId,
            assetId: testAsset1Id,
          },
        },
      });
      expect(link).not.toBeNull();
    });

    it('should prevent duplicate links', async () => {
      // First link (should succeed)
      await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/assets`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          assetId: testAsset2Id,
        },
      });

      // Second link (should fail)
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/assets`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          assetId: testAsset2Id,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000/assets',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          assetId: testAsset1Id,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/assets`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {
          assetId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny Viewer role from linking', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/assets`,
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
        payload: {
          assetId: testAsset1Id,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require assetId in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/risks/${testRiskId}/assets`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/risks/:id/assets/:assetId', () => {
    beforeAll(async () => {
      // Ensure a link exists for deletion tests
      await prisma.riskAsset.create({
        data: {
          riskId: testRiskId,
          assetId: testAsset1Id,
        },
      }).catch(() => {}); // Ignore if already exists
    });

    it('should unlink an asset from a risk', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}/assets/${testAsset1Id}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Asset unlinked from risk successfully');

      // Verify link was deleted
      const link = await prisma.riskAsset.findUnique({
        where: {
          riskId_assetId: {
            riskId: testRiskId,
            assetId: testAsset1Id,
          },
        },
      });
      expect(link).toBeNull();
    });

    it('should return 404 for non-existent link', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}/assets/${testAsset1Id}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent risk', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/risks/00000000-0000-0000-0000-000000000000/assets/test',
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny Viewer role from unlinking', async () => {
      // Create a link first
      await prisma.riskAsset.create({
        data: {
          riskId: testRiskId,
          assetId: testAsset2Id,
        },
      }).catch(() => {});

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${testRiskId}/assets/${testAsset2Id}`,
        headers: {
          authorization: `Bearer ${viewerToken}`,
        },
      });

      expect(response.statusCode).toBe(403);

      // Clean up
      await prisma.riskAsset.delete({
        where: {
          riskId_assetId: {
            riskId: testRiskId,
            assetId: testAsset2Id,
          },
        },
      }).catch(() => {});
    });
  });

  describe('GET /api/v1/risks/:id (with assets)', () => {
    beforeAll(async () => {
      // Clean up existing links
      await prisma.riskAsset.deleteMany({
        where: { riskId: testRiskId },
      });

      // Create fresh links
      await prisma.riskAsset.createMany({
        data: [
          { riskId: testRiskId, assetId: testAsset1Id },
          { riskId: testRiskId, assetId: testAsset2Id },
        ],
      });
    });

    it('should include linked assets in risk detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/risks/${testRiskId}`,
        headers: {
          authorization: `Bearer ${analystToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.risk.assets).toBeDefined();
      expect(body.risk.assets.length).toBe(2);

      const asset = body.risk.assets[0].asset;
      expect(asset).toHaveProperty('id');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('type');
      expect(asset).toHaveProperty('status');
    });
  });
});
