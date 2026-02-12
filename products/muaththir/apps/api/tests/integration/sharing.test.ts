import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;
let accessToken: string;
let parentId: string;
let childId: string;

const parentRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima-sharing@example.com',
  password: 'SecurePass1',
};

const inviteeRegistration = {
  name: 'Grandma Aisha',
  email: 'grandma-sharing@example.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(
  payload = parentRegistration
): Promise<{ token: string; id: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload,
  });
  const body = res.json();
  return { token: body.accessToken, id: body.user.id };
}

async function createChild(pId: string): Promise<string> {
  const child = await prisma.child.create({
    data: {
      parentId: pId,
      name: 'Ahmad',
      dateOfBirth: new Date('2018-05-15'),
      gender: 'male',
    },
  });
  return child.id;
}

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
  const result = await registerAndGetToken();
  accessToken = result.token;
  parentId = result.id;
  childId = await createChild(parentId);
});

describe('POST /api/sharing/invite', () => {
  it('should invite a family member and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'grandma@example.com',
        role: 'viewer',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.parentId).toBe(parentId);
    expect(body.inviteeEmail).toBe('grandma@example.com');
    expect(body.role).toBe('viewer');
    expect(body.status).toBe('pending');
    expect(body.childIds).toContain(childId);
    expect(body.invitedAt).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should invite with contributor role', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'grandma@example.com',
        role: 'contributor',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().role).toBe('contributor');
  });

  it('should default to viewer role when not specified', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'grandma@example.com',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().role).toBe('viewer');
  });

  it('should share only specified children when childIds provided', async () => {
    const childId2 = await createChild(parentId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'grandma@example.com',
        childIds: [childId],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.childIds).toEqual([childId]);
    expect(body.childIds).not.toContain(childId2);
  });

  it('should share all children when childIds not provided', async () => {
    const childId2 = await createChild(parentId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'grandma@example.com',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.childIds).toHaveLength(2);
    expect(body.childIds).toContain(childId);
    expect(body.childIds).toContain(childId2);
  });

  it('should set inviteeId when invitee has an account', async () => {
    const invitee = await registerAndGetToken(inviteeRegistration);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: inviteeRegistration.email,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().inviteeId).toBe(invitee.id);
  });

  it('should set inviteeId to null when invitee has no account', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'nonexistent@example.com',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().inviteeId).toBeNull();
  });

  it('should prevent self-invite', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: parentRegistration.email,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should prevent self-invite case-insensitively', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: parentRegistration.email.toUpperCase(),
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should prevent duplicate invite', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com' },
    });

    expect(response.statusCode).toBe(409);
  });

  it('should reject invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      payload: { email: 'grandma@example.com' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject invalid childIds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email: 'grandma@example.com',
        childIds: ['nonexistent-child-id'],
      },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/sharing', () => {
  it('should return an empty list when no shares', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('should return all shares for the current parent', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com' },
    });

    await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'uncle@example.com' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it('should not return shares belonging to other parents', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com' },
    });

    const other = await registerAndGetToken({
      name: 'Other Parent',
      email: 'other-sharing@example.com',
      password: 'SecurePass1',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing',
      headers: { authorization: `Bearer ${other.token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(0);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('PATCH /api/sharing/:id', () => {
  let shareId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com', role: 'viewer' },
    });
    shareId = res.json().id;
  });

  it('should update share role', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sharing/${shareId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { role: 'contributor' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().role).toBe('contributor');
  });

  it('should update share childIds', async () => {
    const childId2 = await createChild(parentId);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sharing/${shareId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { childIds: [childId2] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().childIds).toEqual([childId2]);
  });

  it('should reject update by non-owner', async () => {
    const other = await registerAndGetToken({
      name: 'Other Parent',
      email: 'other-sharing@example.com',
      password: 'SecurePass1',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sharing/${shareId}`,
      headers: { authorization: `Bearer ${other.token}` },
      payload: { role: 'contributor' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should return 404 for non-existent share', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/sharing/nonexistent-id',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { role: 'contributor' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sharing/${shareId}`,
      payload: { role: 'contributor' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('DELETE /api/sharing/:id', () => {
  let shareId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com' },
    });
    shareId = res.json().id;
  });

  it('should revoke a share and return 204', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/sharing/${shareId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should actually remove the share from the database', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/sharing/${shareId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const share = await prisma.familyAccess.findUnique({
      where: { id: shareId },
    });
    expect(share).toBeNull();
  });

  it('should reject delete by non-owner', async () => {
    const other = await registerAndGetToken({
      name: 'Other Parent',
      email: 'other-sharing@example.com',
      password: 'SecurePass1',
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/sharing/${shareId}`,
      headers: { authorization: `Bearer ${other.token}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should return 404 for non-existent share', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/sharing/nonexistent-id',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/sharing/${shareId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/sharing/shared-with-me', () => {
  it('should return shares where current user is invitee by email', async () => {
    const invitee = await registerAndGetToken(inviteeRegistration);

    // Parent invites grandma
    await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: inviteeRegistration.email },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing/shared-with-me',
      headers: { authorization: `Bearer ${invitee.token}` },
    });

    expect(response.statusCode).toBe(200);
    const shares = response.json();
    expect(shares).toHaveLength(1);
    expect(shares[0].parentId).toBe(parentId);
    expect(shares[0].inviteeEmail).toBe(inviteeRegistration.email);
  });

  it('should return empty list when user has no shares', async () => {
    const invitee = await registerAndGetToken(inviteeRegistration);

    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing/shared-with-me',
      headers: { authorization: `Bearer ${invitee.token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('should not return shares owned by the current user', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'grandma@example.com' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing/shared-with-me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(0);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sharing/shared-with-me',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/sharing/:id/respond', () => {
  let shareId: string;
  let inviteeToken: string;

  beforeEach(async () => {
    const invitee = await registerAndGetToken(inviteeRegistration);
    inviteeToken = invitee.token;

    const res = await app.inject({
      method: 'POST',
      url: '/api/sharing/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: inviteeRegistration.email },
    });
    shareId = res.json().id;
  });

  it('should accept an invitation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('accepted');
    expect(body.respondedAt).toBeDefined();
  });

  it('should decline an invitation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'decline' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('declined');
    expect(body.respondedAt).toBeDefined();
  });

  it('should set inviteeId when responding', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().inviteeId).toBeDefined();
  });

  it('should reject response from non-invitee', async () => {
    const other = await registerAndGetToken({
      name: 'Stranger',
      email: 'stranger-sharing@example.com',
      password: 'SecurePass1',
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${other.token}` },
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should reject response from the parent (owner)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should reject responding to an already responded invitation', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'accept' },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'decline' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 for non-existent share', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sharing/nonexistent-id/respond',
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject invalid action', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { action: 'maybe' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/sharing/${shareId}/respond`,
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(401);
  });
});
