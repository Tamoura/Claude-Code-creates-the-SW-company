import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('RBAC Authorization Middleware', () => {
  let app: FastifyInstance;
  const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440002';

  const users: Record<string, { token: string; id: string }> = {};

  beforeAll(async () => {
    app = await buildApp({ logger: false });

    // Clean up any existing test data
    await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
    await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
    await prisma.organization.delete({ where: { id: TEST_ORG_ID } }).catch(() => {});

    // Create test organization
    await prisma.organization.create({
      data: {
        id: TEST_ORG_ID,
        name: 'Test Organization RBAC',
        slug: 'test-org-rbac',
      },
    });

    // Register users with different roles
    const roles = ['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN'];

    for (const role of roles) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${role.toLowerCase()}@example.com`,
          password: 'SecurePass123!',
          name: `${role} User`,
          organizationId: TEST_ORG_ID,
        },
      });

      const body = response.json();
      users[role] = { token: body.token, id: body.user.id };

      // Update user role (except VIEWER which is default)
      if (role !== 'VIEWER') {
        await prisma.user.update({
          where: { id: body.user.id },
          data: { role },
        });
      }
    }
  });

  afterAll(async () => {
    // Delete in proper order to respect foreign key constraints
    await prisma.session.deleteMany({ where: { user: { organizationId: TEST_ORG_ID } } });
    await prisma.risk.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('Risk Management Permissions', () => {
    it('should allow VIEWER to read risks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.VIEWER.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny VIEWER from creating risks', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.VIEWER.token}`,
        },
        payload: {
          title: 'Test Risk',
          description: 'Test Description',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('permission');
    });

    it('should allow ANALYST to create risks', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.ANALYST.token}`,
        },
        payload: {
          title: 'Test Risk',
          description: 'Test Description',
          category: 'Security',
          likelihood: 3,
          impact: 4,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should allow MANAGER to create and delete risks', async () => {
      // Create risk
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
        payload: {
          title: 'Manager Test Risk',
          description: 'Test Description',
          category: 'Operational',
          likelihood: 2,
          impact: 3,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const riskId = createResponse.json().risk.id;

      // Delete risk
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${riskId}`,
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);
    });

    it('should deny ANALYST from deleting risks', async () => {
      // Create risk as MANAGER
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
        payload: {
          title: 'Risk for Delete Test',
          description: 'Test Description',
          category: 'Financial',
          likelihood: 3,
          impact: 3,
        },
      });

      const riskId = createResponse.json().risk.id;

      // Try to delete as ANALYST
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/risks/${riskId}`,
        headers: {
          authorization: `Bearer ${users.ANALYST.token}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(403);
      const body = deleteResponse.json();
      expect(body.message).toContain('permission');
    });
  });

  describe('User Management Permissions', () => {
    it('should allow ADMIN to manage users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: {
          authorization: `Bearer ${users.ADMIN.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny MANAGER from managing users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.message).toContain('permission');
    });

    it('should allow ADMIN to change user roles', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${users.VIEWER.id}/role`,
        headers: {
          authorization: `Bearer ${users.ADMIN.token}`,
        },
        payload: {
          role: 'ANALYST',
        },
      });

      expect(response.statusCode).toBe(200);

      // Reset role
      await prisma.user.update({
        where: { id: users.VIEWER.id },
        data: { role: 'VIEWER' },
      });
    });

    it('should deny non-ADMIN from changing user roles', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${users.VIEWER.id}/role`,
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
        payload: {
          role: 'MANAGER',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Assessment Approval Permissions', () => {
    it('should allow MANAGER to approve assessments', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/test-id/approve',
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
      });

      // Will fail because assessment doesn't exist, but we're testing authorization
      expect([200, 404]).toContain(response.statusCode);
    });

    it('should deny ANALYST from approving assessments', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/test-id/approve',
        headers: {
          authorization: `Bearer ${users.ANALYST.token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.message).toContain('permission');
    });
  });

  describe('Role Hierarchy', () => {
    it('should respect role hierarchy for permissions', async () => {
      // ADMIN should have all permissions
      const adminResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.ADMIN.token}`,
        },
      });
      expect(adminResponse.statusCode).toBe(200);

      // MANAGER should have read/create/update permissions
      const managerResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/risks/test-id',
        headers: {
          authorization: `Bearer ${users.MANAGER.token}`,
        },
        payload: { title: 'Updated' },
      });
      expect([200, 404]).toContain(managerResponse.statusCode); // 404 if doesn't exist, but authorized

      // ANALYST should have read/create permissions only
      const analystCreateResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.ANALYST.token}`,
        },
        payload: {
          title: 'Analyst Risk',
          description: 'Test',
          category: 'Compliance',
          likelihood: 2,
          impact: 2,
        },
      });
      expect(analystCreateResponse.statusCode).toBe(201);

      // VIEWER should have read permissions only
      const viewerResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/risks',
        headers: {
          authorization: `Bearer ${users.VIEWER.token}`,
        },
      });
      expect(viewerResponse.statusCode).toBe(200);
    });
  });
});
