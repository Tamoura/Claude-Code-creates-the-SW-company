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
let conversationId: string;

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

  // Create connection
  const prisma = getPrisma();
  await prisma.connection.create({
    data: {
      senderId: alice.id,
      receiverId: bob.id,
      status: 'ACCEPTED',
      respondedAt: new Date(),
    },
  });

  // Create conversation
  const convRes = await app.inject({
    method: 'POST',
    url: '/api/v1/conversations',
    headers: authHeaders(alice.accessToken),
    payload: { otherUserId: bob.id },
  });
  conversationId = JSON.parse(convRes.body).data.id;

  // Create a media record for testing (simulating an uploaded file)
  await prisma.media.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      uploaderId: alice.id,
      type: 'DOCUMENT',
      status: 'READY',
      originalName: 'resume.pdf',
      mimeType: 'application/pdf',
      size: 102400,
      url: 'https://storage.example.com/resume.pdf',
    },
  });
});

describe('File Sharing in Messages', () => {
  it('should send a message with a file attachment', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/messages',
      headers: authHeaders(alice.accessToken),
      payload: {
        conversationId,
        content: 'Here is my resume',
        mediaId: '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.media).toBeDefined();
    expect(body.data.media.originalName).toBe('resume.pdf');
  });

  it('should send a message without attachment (backward compatible)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/messages',
      headers: authHeaders(alice.accessToken),
      payload: {
        conversationId,
        content: 'Just a text message',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.media).toBeUndefined();
  });

  it('should reject invalid media ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/messages',
      headers: authHeaders(alice.accessToken),
      payload: {
        conversationId,
        content: 'Bad attachment',
        mediaId: '00000000-0000-0000-0000-999999999999',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should include media in message history', async () => {
    // Send message with attachment
    await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/messages',
      headers: authHeaders(alice.accessToken),
      payload: {
        conversationId,
        content: 'Check this file',
        mediaId: '00000000-0000-0000-0000-000000000001',
      },
    });

    // Retrieve messages
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conversationId}/messages`,
      headers: authHeaders(bob.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const msgWithMedia = body.data.find((m: any) => m.media);
    expect(msgWithMedia).toBeDefined();
    expect(msgWithMedia.media.originalName).toBe('resume.pdf');
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
    });
    expect(res.statusCode).toBe(401);
  });
});
