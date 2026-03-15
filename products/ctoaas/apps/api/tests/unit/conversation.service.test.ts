/**
 * Conversation Service & Routes Tests
 *
 * Implements:
 *   FR-011 (Conversation Management)
 *
 * Tests define expected behavior for ConversationService and routes.
 * Uses direct DB seeding + JWT signing for reliable test isolation.
 *
 * [IMPL-038]
 */
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  getApp,
  closeApp,
  getPrisma,
  cleanDatabase,
  authHeaders,
} from '../helpers';

const CONV_BASE = '/api/v1/conversations';

let app: FastifyInstance;
let prisma: PrismaClient;

interface TestUserData {
  id: string;
  orgId: string;
  accessToken: string;
}

/**
 * Create a user directly in the database and sign a JWT for them.
 * Avoids the flaky signup/login HTTP round-trip.
 */
async function seedUser(suffix: string): Promise<TestUserData> {
  const org = await prisma.organization.create({
    data: {
      name: `Conv Test Co ${suffix}`,
      industry: 'Technology',
      employeeCount: 10,
      growthStage: 'SEED',
    },
  });

  await prisma.companyProfile.create({
    data: { organizationId: org.id },
  });

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: `conv-${suffix}-${Date.now()}@example.com`,
      name: `Conv User ${suffix}`,
      passwordHash: 'not-used-in-these-tests',
      role: 'CTO',
    },
  });

  const accessToken = app.jwt.sign({
    sub: user.id,
    role: user.role,
    jti: `test-jti-${suffix}-${Date.now()}`,
  });

  return { id: user.id, orgId: org.id, accessToken };
}

beforeAll(async () => {
  app = await getApp();
  prisma = getPrisma();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('ConversationService', () => {
  // ── FR-011 AC-1: Create new conversation ────────────────────────
  test('[FR-011][AC-1] creates new conversation for user', async () => {
    const user = await seedUser('ac1');

    const res = await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user.accessToken),
      payload: { title: 'My first conversation' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.title).toBe('My first conversation');
    expect(body.data.messageCount).toBe(0);

    // Verify in DB
    const conv = await prisma.conversation.findUnique({
      where: { id: body.data.id },
    });
    expect(conv).not.toBeNull();
    expect(conv!.userId).toBe(user.id);
  });

  // ── FR-011 AC-2: List conversations ordered by updatedAt DESC ───
  test('[FR-011][AC-2] lists conversations ordered by updatedAt desc', async () => {
    const user = await seedUser('ac2');

    // Create 3 conversations with staggered times
    const titles = ['First', 'Second', 'Third'];
    for (const title of titles) {
      await app.inject({
        method: 'POST',
        url: CONV_BASE,
        headers: authHeaders(user.accessToken),
        payload: { title },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: CONV_BASE,
      headers: authHeaders(user.accessToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.conversations).toHaveLength(3);

    // Most recently created should come first
    const convTitles = body.data.conversations.map(
      (c: { title: string }) => c.title
    );
    expect(convTitles[0]).toBe('Third');
  });

  // ── FR-011 AC-3: Get conversation with messages ─────────────────
  test('[FR-011][AC-3] gets conversation with messages', async () => {
    const user = await seedUser('ac3');

    const createRes = await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user.accessToken),
      payload: { title: 'With Messages' },
    });
    expect(createRes.statusCode).toBe(201);
    const convId = JSON.parse(createRes.body).data.id;

    // Add messages directly to DB
    await prisma.message.createMany({
      data: [
        {
          conversationId: convId,
          role: 'USER',
          content: 'How should I structure my microservices?',
        },
        {
          conversationId: convId,
          role: 'ASSISTANT',
          content: 'Consider using domain-driven design boundaries.',
          confidence: 'HIGH',
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: `${CONV_BASE}/${convId}`,
      headers: authHeaders(user.accessToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(convId);
    expect(body.data.messages).toHaveLength(2);
    expect(body.data.messages[0].role).toBe('USER');
    expect(body.data.messages[1].role).toBe('ASSISTANT');
  });

  // ── FR-011 AC-4: Generate title from first 2 messages ──────────
  test('[FR-011][AC-4] generates title from first message content', async () => {
    const user = await seedUser('ac4');

    const createRes = await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user.accessToken),
      payload: {},
    });
    expect(createRes.statusCode).toBe(201);
    const convId = JSON.parse(createRes.body).data.id;

    // Add messages directly to DB
    await prisma.message.createMany({
      data: [
        {
          conversationId: convId,
          role: 'USER',
          content:
            'What is the best approach for Kubernetes deployment strategies?',
        },
        {
          conversationId: convId,
          role: 'ASSISTANT',
          content:
            'You should consider blue-green or canary deployments.',
        },
      ],
    });

    // Generate title
    const res = await app.inject({
      method: 'POST',
      url: `${CONV_BASE}/${convId}/generate-title`,
      headers: authHeaders(user.accessToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.title).toBeDefined();
    expect(body.data.title.length).toBeGreaterThan(0);
    expect(body.data.title.length).toBeLessThanOrEqual(100);
  });

  // ── FR-011: Paginate conversation list ──────────────────────────
  test('[FR-011] paginates conversation list', async () => {
    const user = await seedUser('pag');

    // Create 5 conversations
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: CONV_BASE,
        headers: authHeaders(user.accessToken),
        payload: { title: `Conv ${i}` },
      });
    }

    // Request page 1 with limit 2
    const res = await app.inject({
      method: 'GET',
      url: `${CONV_BASE}?page=1&limit=2`,
      headers: authHeaders(user.accessToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.conversations).toHaveLength(2);
    expect(body.data.total).toBe(5);
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(2);
  });

  // ── FR-011: Scope conversations to user ─────────────────────────
  test('[FR-011] scopes conversations to user', async () => {
    const user1 = await seedUser('scope1');
    const user2 = await seedUser('scope2');

    // Create conversation for user1
    await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user1.accessToken),
      payload: { title: 'User 1 conv' },
    });

    // User2 should not see user1 conversations
    const res = await app.inject({
      method: 'GET',
      url: CONV_BASE,
      headers: authHeaders(user2.accessToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.conversations).toHaveLength(0);
  });

  // ── Update conversation title ───────────────────────────────────
  test('[FR-011] updates conversation title', async () => {
    const user = await seedUser('upd');

    const createRes = await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user.accessToken),
      payload: { title: 'Old Title' },
    });
    expect(createRes.statusCode).toBe(201);
    const convId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PUT',
      url: `${CONV_BASE}/${convId}`,
      headers: authHeaders(user.accessToken),
      payload: { title: 'New Title' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('New Title');
  });

  // ── Delete (archive) conversation ──────────────────────────────
  test('[FR-011] deletes conversation', async () => {
    const user = await seedUser('del');

    const createRes = await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user.accessToken),
      payload: { title: 'To Delete' },
    });
    expect(createRes.statusCode).toBe(201);
    const convId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `${CONV_BASE}/${convId}`,
      headers: authHeaders(user.accessToken),
    });

    expect(res.statusCode).toBe(200);

    // Verify deleted from DB
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    expect(conv).toBeNull();
  });

  // ── 401 without auth ───────────────────────────────────────────
  test('[FR-011] requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: CONV_BASE,
    });

    expect(res.statusCode).toBe(401);
  });

  // ── 404 for other user's conversation ──────────────────────────
  test('[FR-011] returns 404 for other user conversation', async () => {
    const user1 = await seedUser('own1');
    const user2 = await seedUser('own2');

    const createRes = await app.inject({
      method: 'POST',
      url: CONV_BASE,
      headers: authHeaders(user1.accessToken),
      payload: { title: 'Private' },
    });
    expect(createRes.statusCode).toBe(201);
    const convId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'GET',
      url: `${CONV_BASE}/${convId}`,
      headers: authHeaders(user2.accessToken),
    });

    expect(res.statusCode).toBe(404);
  });
});
