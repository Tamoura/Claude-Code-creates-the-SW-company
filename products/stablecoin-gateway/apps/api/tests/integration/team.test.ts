import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Team Management API Tests
 *
 * Tests organization creation, member management, and role-based
 * access control. Verifies business logic:
 * - Only OWNER/ADMIN can manage members
 * - Last OWNER cannot be demoted/removed
 * - MEMBER and VIEWER cannot modify team
 * - Non-members cannot access organizations
 */

describe('Team Management API', () => {
  let app: FastifyInstance;

  // User 1: will be the org owner
  let ownerToken: string;
  let ownerId: string;

  // User 2: will be added as a member
  let memberToken: string;
  let memberEmail: string;

  // User 3: non-member (outsider)
  let outsiderToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create owner user
    const ownerSignup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'team-owner@example.com',
        password: 'SecurePass123!',
      },
    });
    const ownerBody = ownerSignup.json();
    ownerToken = ownerBody.access_token;
    ownerId = ownerBody.id;

    // Create member user
    memberEmail = 'team-member@example.com';
    const memberSignup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: memberEmail,
        password: 'SecurePass123!',
      },
    });
    memberToken = memberSignup.json().access_token;

    // Create outsider user
    const outsiderSignup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'team-outsider@example.com',
        password: 'SecurePass123!',
      },
    });
    outsiderToken = outsiderSignup.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // Flush rate limit keys between tests
  beforeEach(async () => {
    if (app.redis) {
      const keys = await app.redis.keys('ratelimit:*');
      if (keys.length > 0) {
        await app.redis.del(...keys);
      }
    }
  });

  describe('POST /v1/team/organizations', () => {
    it('should create organization and assign creator as OWNER', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'Test Org' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Test Org');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');
      expect(body.members).toHaveLength(1);
      expect(body.members[0].role).toBe('OWNER');
      expect(body.members[0].user_id).toBe(ownerId);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/team/organizations',
        payload: { name: 'No Auth Org' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/team/organizations', () => {
    it('should list user organizations', async () => {
      // Create another org to have multiple
      await app.inject({
        method: 'POST',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'Second Org' },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty('data');
      expect(body.data.length).toBeGreaterThanOrEqual(2);

      const org = body.data[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('role');
      expect(org).toHaveProperty('joined_at');
    });

    it('should return empty list for user with no orgs', async () => {
      // Outsider has no orgs yet
      const response = await app.inject({
        method: 'GET',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${outsiderToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveLength(0);
    });
  });

  describe('Full team management workflow', () => {
    let orgId: string;
    let addedMemberId: string;

    beforeAll(async () => {
      // Create a fresh org for workflow tests
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'Workflow Org' },
      });
      orgId = createResponse.json().id;
    });

    it('should get organization details with members', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/team/organizations/${orgId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.id).toBe(orgId);
      expect(body.name).toBe('Workflow Org');
      expect(body.members).toHaveLength(1);
      expect(body.members[0].role).toBe('OWNER');
    });

    it('should add member by email (OWNER adds MEMBER)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: memberEmail, role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body).toHaveProperty('id');
      expect(body.email).toBe(memberEmail);
      expect(body.role).toBe('MEMBER');
      expect(body.invited_by).toBe(ownerId);

      addedMemberId = body.id;
    });

    it('should reject duplicate membership (409)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: memberEmail, role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should reject non-existent email (404)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'nonexistent@example.com', role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update member role (OWNER promotes MEMBER to ADMIN)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/team/organizations/${orgId}/members/${addedMemberId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { role: 'ADMIN' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.id).toBe(addedMemberId);
      expect(body.role).toBe('ADMIN');
    });

    it('should not allow demoting the last OWNER (400)', async () => {
      // Find the owner's membership ID
      const orgDetails = await app.inject({
        method: 'GET',
        url: `/v1/team/organizations/${orgId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      const ownerMembership = orgDetails.json().members.find(
        (m: any) => m.role === 'OWNER'
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/team/organizations/${orgId}/members/${ownerMembership.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().detail).toContain('last owner');
    });

    it('should not allow removing the last OWNER (400)', async () => {
      const orgDetails = await app.inject({
        method: 'GET',
        url: `/v1/team/organizations/${orgId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      const ownerMembership = orgDetails.json().members.find(
        (m: any) => m.role === 'OWNER'
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/team/organizations/${orgId}/members/${ownerMembership.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().detail).toContain('last owner');
    });

    it('should allow non-member to not access org (403)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/team/organizations/${orgId}`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not allow MEMBER to add others (403)', async () => {
      // Demote the added member back to MEMBER for this test
      await app.inject({
        method: 'PATCH',
        url: `/v1/team/organizations/${orgId}/members/${addedMemberId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { role: 'MEMBER' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { email: 'team-outsider@example.com', role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not allow MEMBER to remove others (403)', async () => {
      // Get the owner membership ID
      const orgDetails = await app.inject({
        method: 'GET',
        url: `/v1/team/organizations/${orgId}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });
      const ownerMembership = orgDetails.json().members.find(
        (m: any) => m.role === 'OWNER'
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/team/organizations/${orgId}/members/${ownerMembership.id}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not allow VIEWER to modify anything (403)', async () => {
      // Update to VIEWER
      await app.inject({
        method: 'PATCH',
        url: `/v1/team/organizations/${orgId}/members/${addedMemberId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { role: 'VIEWER' },
      });

      // Try to add a member as VIEWER
      const addResponse = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { email: 'team-outsider@example.com', role: 'MEMBER' },
      });
      expect(addResponse.statusCode).toBe(403);

      // Try to update a role as VIEWER
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/team/organizations/${orgId}/members/${addedMemberId}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { role: 'MEMBER' },
      });
      expect(updateResponse.statusCode).toBe(403);
    });

    it('should allow member to leave organization', async () => {
      // Restore to MEMBER role first
      await app.inject({
        method: 'PATCH',
        url: `/v1/team/organizations/${orgId}/members/${addedMemberId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { role: 'MEMBER' },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/team/organizations/${orgId}/leave`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(response.statusCode).toBe(204);

      // Verify they are no longer a member
      const orgResponse = await app.inject({
        method: 'GET',
        url: `/v1/team/organizations/${orgId}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });
      expect(orgResponse.statusCode).toBe(403);
    });

    it('should not allow last OWNER to leave (400)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/team/organizations/${orgId}/leave`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().detail).toContain('last owner');
    });
  });

  describe('ADMIN removes MEMBER', () => {
    let orgId: string;
    let adminMemberId: string;
    let regularMemberId: string;
    let adminToken: string;

    beforeAll(async () => {
      // Create a fresh org
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/team/organizations',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'Admin Test Org' },
      });
      orgId = createResponse.json().id;

      // Create an admin user
      const adminSignup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'team-admin@example.com',
          password: 'SecurePass123!',
        },
      });
      adminToken = adminSignup.json().access_token;

      // Add admin to org
      const addAdmin = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: 'team-admin@example.com', role: 'ADMIN' },
      });
      adminMemberId = addAdmin.json().id;

      // Add regular member to org
      const addMember = await app.inject({
        method: 'POST',
        url: `/v1/team/organizations/${orgId}/members`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { email: memberEmail, role: 'MEMBER' },
      });
      regularMemberId = addMember.json().id;
    });

    it('should allow ADMIN to remove MEMBER', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/team/organizations/${orgId}/members/${regularMemberId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
