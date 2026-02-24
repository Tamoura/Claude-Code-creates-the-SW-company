import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
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

describe('Groups', () => {
  it('should create a group', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: {
        name: 'Arab Tech Professionals',
        description: 'A group for Arab tech professionals',
        privacy: 'PUBLIC',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe('Arab Tech Professionals');
    expect(body.data.privacy).toBe('PUBLIC');
  });

  it('should list groups', async () => {
    // Create two groups
    await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Group A', privacy: 'PUBLIC' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(bob.accessToken),
      payload: { name: 'Group B', privacy: 'PUBLIC' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should join and leave a group', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Open Group', privacy: 'PUBLIC' },
    });
    const groupId = JSON.parse(createRes.body).data.id;

    // Bob joins
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/join`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });
    expect(joinRes.statusCode).toBe(201);

    // Bob leaves
    const leaveRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${groupId}/join`,
      headers: authHeaders(bob.accessToken),
    });
    expect(leaveRes.statusCode).toBe(200);
  });

  it('should list group members', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Test Group', privacy: 'PUBLIC' },
    });
    const groupId = JSON.parse(createRes.body).data.id;

    // Bob joins
    await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/join`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}/members`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2); // alice (owner) + bob
  });

  it('should post in a group', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Discussion Group', privacy: 'PUBLIC' },
    });
    const groupId = JSON.parse(createRes.body).data.id;

    const postRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/posts`,
      headers: authHeaders(alice.accessToken),
      payload: { content: 'Hello group!' },
    });
    expect(postRes.statusCode).toBe(201);
    const body = JSON.parse(postRes.body);
    expect(body.data.content).toBe('Hello group!');
  });

  it('should list group posts', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Feed Group', privacy: 'PUBLIC' },
    });
    const groupId = JSON.parse(createRes.body).data.id;

    await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/posts`,
      headers: authHeaders(alice.accessToken),
      payload: { content: 'First post' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}/posts`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });

  it('should require membership to post in private group', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Private Group', privacy: 'PRIVATE' },
    });
    const groupId = JSON.parse(createRes.body).data.id;

    // Bob tries to post without being a member
    const postRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/posts`,
      headers: authHeaders(bob.accessToken),
      payload: { content: 'Uninvited' },
    });
    expect(postRes.statusCode).toBe(403);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/groups',
    });
    expect(res.statusCode).toBe(401);
  });
});
