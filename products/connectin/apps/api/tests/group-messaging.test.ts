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

  // Create connections: Alice<->Bob, Alice<->Charlie
  const prisma = getPrisma();
  await prisma.connection.createMany({
    data: [
      { senderId: alice.id, receiverId: bob.id, status: 'ACCEPTED', respondedAt: new Date() },
      { senderId: alice.id, receiverId: charlie.id, status: 'ACCEPTED', respondedAt: new Date() },
    ],
  });
});

describe('Group Messaging', () => {
  it('should create a group conversation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: {
        name: 'Project Team',
        memberIds: [bob.id, charlie.id],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.isGroup).toBe(true);
    expect(body.data.name).toBe('Project Team');
    expect(body.data.memberCount).toBe(3); // alice + bob + charlie
  });

  it('should require at least 2 other members for a group', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: {
        name: 'Too Small',
        memberIds: [bob.id], // Only 1 other member
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it('should send messages in a group', async () => {
    // Create group
    const groupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: {
        name: 'Team Chat',
        memberIds: [bob.id, charlie.id],
      },
    });
    const groupId = JSON.parse(groupRes.body).data.id;

    // Alice sends message
    const msgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/messages',
      headers: authHeaders(alice.accessToken),
      payload: { conversationId: groupId, content: 'Hello team!' },
    });
    expect(msgRes.statusCode).toBe(201);

    // Bob can see it
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${groupId}/messages`,
      headers: authHeaders(bob.accessToken),
    });
    expect(getRes.statusCode).toBe(200);
    const messages = JSON.parse(getRes.body).data;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Hello team!');
  });

  it('should allow admin to add members', async () => {
    const dave = await createTestUser(app, { displayName: 'Dave' });
    // Connect Alice with Dave
    const prisma = getPrisma();
    await prisma.connection.create({
      data: { senderId: alice.id, receiverId: dave.id, status: 'ACCEPTED', respondedAt: new Date() },
    });

    const groupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Team', memberIds: [bob.id, charlie.id] },
    });
    const groupId = JSON.parse(groupRes.body).data.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/groups/${groupId}/members`,
      headers: authHeaders(alice.accessToken),
      payload: { userId: dave.id },
    });
    expect(res.statusCode).toBe(200);
  });

  it('should allow admin to remove members', async () => {
    const groupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Team', memberIds: [bob.id, charlie.id] },
    });
    const groupId = JSON.parse(groupRes.body).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/conversations/groups/${groupId}/members/${charlie.id}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('should not allow non-admin to remove members', async () => {
    const groupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Team', memberIds: [bob.id, charlie.id] },
    });
    const groupId = JSON.parse(groupRes.body).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/conversations/groups/${groupId}/members/${charlie.id}`,
      headers: authHeaders(bob.accessToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('should allow a member to leave a group', async () => {
    const groupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/groups',
      headers: authHeaders(alice.accessToken),
      payload: { name: 'Team', memberIds: [bob.id, charlie.id] },
    });
    const groupId = JSON.parse(groupRes.body).data.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/groups/${groupId}/leave`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
    });
    expect(res.statusCode).toBe(401);
  });
});
