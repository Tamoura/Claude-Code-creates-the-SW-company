import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
  getPrisma,
} from './helpers';

let app: FastifyInstance;
let alice: TestUser;
let bob: TestUser;
let charlie: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  alice = await createTestUser(app, { displayName: 'Alice' });
  bob = await createTestUser(app, { displayName: 'Bob' });
  charlie = await createTestUser(app, { displayName: 'Charlie' });
});

describe('Company/Organization Pages', () => {
  it('should create an organization', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: {
        name: 'Acme Corp',
        slug: 'acme-corp',
        description: 'A technology company',
        industry: 'Technology',
        website: 'https://acme.com',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe('Acme Corp');
    expect(body.data.slug).toBe('acme-corp');
    // Creator should automatically be an admin member
  });

  it('should get organization details with counts', async () => {
    // Create org
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    // Bob follows
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/follow`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${orgId}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe('Acme Corp');
    expect(body.data.memberCount).toBe(1); // alice as admin
    expect(body.data.followerCount).toBe(1); // bob
  });

  it('should update organization (admin only)', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${orgId}`,
      headers: authHeaders(alice.accessToken),
      payload: { description: 'Updated description', industry: 'Finance' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.description).toBe('Updated description');
    expect(body.data.industry).toBe('Finance');
  });

  it('should reject non-admin update', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${orgId}`,
      headers: authHeaders(bob.accessToken),
      payload: { description: 'Hacked' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should follow and unfollow an organization', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    // Follow
    const followRes = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/follow`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });
    expect(followRes.statusCode).toBe(201);

    // Unfollow
    const unfollowRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${orgId}/follow`,
      headers: authHeaders(bob.accessToken),
    });
    expect(unfollowRes.statusCode).toBe(200);
  });

  it('should list organization followers', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    // Bob and Charlie follow
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/follow`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/follow`,
      headers: authHeaders(charlie.accessToken),
      payload: {},
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${orgId}/followers`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
  });

  it('should add and remove members (admin only)', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    // Add bob as member
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: authHeaders(alice.accessToken),
      payload: { userId: bob.id, role: 'MEMBER' },
    });
    expect(addRes.statusCode).toBe(201);

    // Remove bob
    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${orgId}/members/${bob.id}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(removeRes.statusCode).toBe(200);
  });

  it('should reject non-admin member management', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: authHeaders(bob.accessToken),
      payload: { userId: charlie.id, role: 'MEMBER' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should list organization members', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    // Add bob
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: authHeaders(alice.accessToken),
      payload: { userId: bob.id, role: 'EDITOR' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2); // alice (admin) + bob (editor)
  });

  it('should list organization jobs', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });
    const orgId = JSON.parse(createRes.body).data.id;

    // Create a job linked to this org
    const prisma = getPrisma();
    await prisma.job.create({
      data: {
        recruiterId: alice.id,
        title: 'Software Engineer',
        company: 'Acme Corp',
        description: 'Build amazing things',
        organizationId: orgId,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${orgId}/jobs`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Software Engineer');
  });

  it('should reject duplicate slug', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Acme Corp', slug: 'acme-corp' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: authHeaders(bob.accessToken),
      payload: { name: 'Another Acme', slug: 'acme-corp' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
    });
    expect(res.statusCode).toBe(401);
  });
});
