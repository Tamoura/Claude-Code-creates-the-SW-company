/**
 * ADR (Architecture Decision Record) Routes Integration Tests
 *
 * Implements:
 *   FR-030 (ADR CRUD Operations)
 *   FR-032 (ADR Status Transitions)
 *   FR-033 (Mermaid Diagram Support)
 *
 * [IMPL-071]
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

// ---------- helpers ----------

const AUTH_BASE = '/api/v1/auth';
const ADR_BASE = '/api/v1/adrs';

interface AuthenticatedUser {
  id: string;
  email: string;
  accessToken: string;
  organizationId: string;
}

let userCounter = 0;

async function createAuthenticatedUser(
  app: FastifyInstance,
  prisma: PrismaClient
): Promise<AuthenticatedUser> {
  userCounter++;
  const email = `adr-test-${userCounter}-${Date.now()}@example.com`;
  const password = 'Str0ng!Pass#2026';

  const signupRes = await app.inject({
    method: 'POST',
    url: `${AUTH_BASE}/signup`,
    payload: {
      name: `ADR Test User ${userCounter}`,
      email,
      password,
      companyName: `AdrTestCo ${userCounter}`,
    },
  });
  expect(signupRes.statusCode).toBe(201);

  const loginRes = await app.inject({
    method: 'POST',
    url: `${AUTH_BASE}/login`,
    payload: { email, password },
  });
  expect(loginRes.statusCode).toBe(200);

  const loginBody = JSON.parse(loginRes.body);
  const accessToken = loginBody.data.accessToken;
  const userId = loginBody.data.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  return {
    id: userId,
    email,
    accessToken,
    organizationId: user!.organizationId,
  };
}

const validAdrPayload = {
  title: 'Use PostgreSQL for primary data store',
  context: 'We need a reliable ACID-compliant database for our fintech platform.',
  decision: 'We will use PostgreSQL 15 with Prisma ORM for all relational data.',
  consequences: 'Team needs PostgreSQL expertise. Vertical scaling limits apply.',
  alternatives: 'MongoDB was considered but rejected due to ACID requirements.',
};

async function createAdr(
  app: FastifyInstance,
  accessToken: string,
  overrides?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await app.inject({
    method: 'POST',
    url: ADR_BASE,
    headers: authHeaders(accessToken),
    payload: { ...validAdrPayload, ...overrides },
  });
  expect(res.statusCode).toBe(201);
  const body = JSON.parse(res.body);
  return body.data;
}

// ---------- suite ----------

describe('ADR Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await getApp();
    prisma = getPrisma();
  });

  afterAll(async () => {
    await closeApp();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ==========================================================
  // POST /api/v1/adrs
  // ==========================================================
  describe('POST /api/v1/adrs', () => {
    test('[FR-030][AC-1] creates ADR with required fields', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'POST',
        url: ADR_BASE,
        headers: authHeaders(user.accessToken),
        payload: validAdrPayload,
      });

      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe(validAdrPayload.title);
      expect(body.data.context).toBe(validAdrPayload.context);
      expect(body.data.decision).toBe(validAdrPayload.decision);
      expect(body.data.consequences).toBe(validAdrPayload.consequences);
      expect(body.data.alternatives).toBe(validAdrPayload.alternatives);
      expect(body.data.status).toBe('PROPOSED');

      // Verify in DB
      const dbRecord = await prisma.architectureDecisionRecord.findUnique({
        where: { id: body.data.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.organizationId).toBe(user.organizationId);
    });

    test('[FR-030] requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: ADR_BASE,
        payload: validAdrPayload,
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-030] validates required fields (title, context, decision)', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Missing title
      const res1 = await app.inject({
        method: 'POST',
        url: ADR_BASE,
        headers: authHeaders(user.accessToken),
        payload: { context: 'some context', decision: 'some decision' },
      });
      expect(res1.statusCode).toBe(400);

      // Missing context
      const res2 = await app.inject({
        method: 'POST',
        url: ADR_BASE,
        headers: authHeaders(user.accessToken),
        payload: { title: 'some title', decision: 'some decision' },
      });
      expect(res2.statusCode).toBe(400);

      // Missing decision
      const res3 = await app.inject({
        method: 'POST',
        url: ADR_BASE,
        headers: authHeaders(user.accessToken),
        payload: { title: 'some title', context: 'some context' },
      });
      expect(res3.statusCode).toBe(400);
    });
  });

  // ==========================================================
  // GET /api/v1/adrs
  // ==========================================================
  describe('GET /api/v1/adrs', () => {
    test('[FR-030][AC-2] lists ADRs for organization', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      await createAdr(app, user.accessToken);
      await createAdr(app, user.accessToken, {
        title: 'Use Redis for caching',
      });

      const res = await app.inject({
        method: 'GET',
        url: ADR_BASE,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toBeDefined();
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBe(2);
    });

    test('[FR-030][AC-3] filters by status', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const adr = await createAdr(app, user.accessToken);
      await createAdr(app, user.accessToken, {
        title: 'Use Redis for caching',
      });

      // Accept the first ADR
      await app.inject({
        method: 'PATCH',
        url: `${ADR_BASE}/${adr.id}/status`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'ACCEPTED' },
      });

      // Filter by PROPOSED status
      const res = await app.inject({
        method: 'GET',
        url: `${ADR_BASE}?status=PROPOSED`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data.items.length).toBe(1);
      expect(body.data.items[0].status).toBe('PROPOSED');
    });

    test('[FR-030] paginates results', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Create 5 ADRs
      for (let i = 0; i < 5; i++) {
        await createAdr(app, user.accessToken, {
          title: `ADR ${i + 1}`,
        });
      }

      // Page 1 with limit 2
      const res = await app.inject({
        method: 'GET',
        url: `${ADR_BASE}?limit=2&offset=0`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data.items.length).toBe(2);
      expect(body.data.total).toBe(5);

      // Page 2
      const res2 = await app.inject({
        method: 'GET',
        url: `${ADR_BASE}?limit=2&offset=2`,
        headers: authHeaders(user.accessToken),
      });

      const body2 = JSON.parse(res2.body);
      expect(body2.data.items.length).toBe(2);
      expect(body2.data.total).toBe(5);
    });
  });

  // ==========================================================
  // GET /api/v1/adrs/:id
  // ==========================================================
  describe('GET /api/v1/adrs/:id', () => {
    test('[FR-030][AC-4] returns ADR detail', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const adr = await createAdr(app, user.accessToken);

      const res = await app.inject({
        method: 'GET',
        url: `${ADR_BASE}/${adr.id}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(adr.id);
      expect(body.data.title).toBe(validAdrPayload.title);
      expect(body.data.context).toBe(validAdrPayload.context);
      expect(body.data.decision).toBe(validAdrPayload.decision);
      expect(body.data.consequences).toBe(validAdrPayload.consequences);
      expect(body.data.alternatives).toBe(validAdrPayload.alternatives);
      expect(body.data.status).toBe('PROPOSED');
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    test('[FR-030] returns 404 for wrong org ADR', async () => {
      const user1 = await createAuthenticatedUser(app, prisma);
      const user2 = await createAuthenticatedUser(app, prisma);

      const adr = await createAdr(app, user1.accessToken);

      // User2 should not access User1's ADR
      const res = await app.inject({
        method: 'GET',
        url: `${ADR_BASE}/${adr.id}`,
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(404);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // PUT /api/v1/adrs/:id
  // ==========================================================
  describe('PUT /api/v1/adrs/:id', () => {
    test('[FR-030][AC-5] updates ADR fields', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const adr = await createAdr(app, user.accessToken);

      const res = await app.inject({
        method: 'PUT',
        url: `${ADR_BASE}/${adr.id}`,
        headers: authHeaders(user.accessToken),
        payload: {
          title: 'Updated title',
          context: 'Updated context',
          decision: 'Updated decision',
          consequences: 'Updated consequences',
        },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated title');
      expect(body.data.context).toBe('Updated context');
      expect(body.data.decision).toBe('Updated decision');
      expect(body.data.consequences).toBe('Updated consequences');

      // Verify in DB
      const dbRecord = await prisma.architectureDecisionRecord.findUnique({
        where: { id: adr.id as string },
      });
      expect(dbRecord!.title).toBe('Updated title');
    });

    test('[FR-033][AC-1] stores mermaid diagram content', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const adr = await createAdr(app, user.accessToken);

      const mermaidDiagram = `graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Data Service]
    C --> E[PostgreSQL]
    D --> E`;

      const res = await app.inject({
        method: 'PUT',
        url: `${ADR_BASE}/${adr.id}`,
        headers: authHeaders(user.accessToken),
        payload: {
          mermaidDiagram,
        },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.mermaidDiagram).toBe(mermaidDiagram);

      // Verify in DB
      const dbRecord = await prisma.architectureDecisionRecord.findUnique({
        where: { id: adr.id as string },
      });
      expect(dbRecord!.mermaidDiagram).toBe(mermaidDiagram);
    });
  });

  // ==========================================================
  // PATCH /api/v1/adrs/:id/status
  // ==========================================================
  describe('PATCH /api/v1/adrs/:id/status', () => {
    test('[FR-032][AC-1] transitions ADR status', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const adr = await createAdr(app, user.accessToken);

      // PROPOSED -> ACCEPTED
      const res = await app.inject({
        method: 'PATCH',
        url: `${ADR_BASE}/${adr.id}/status`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'ACCEPTED' },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ACCEPTED');

      // Verify in DB
      const dbRecord = await prisma.architectureDecisionRecord.findUnique({
        where: { id: adr.id as string },
      });
      expect(dbRecord!.status).toBe('ACCEPTED');
    });
  });

  // ==========================================================
  // DELETE /api/v1/adrs/:id
  // ==========================================================
  describe('DELETE /api/v1/adrs/:id', () => {
    test('[FR-030] archives ADR (soft delete via status)', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const adr = await createAdr(app, user.accessToken);

      const res = await app.inject({
        method: 'DELETE',
        url: `${ADR_BASE}/${adr.id}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Should be soft deleted (status set to DEPRECATED)
      const dbRecord = await prisma.architectureDecisionRecord.findUnique({
        where: { id: adr.id as string },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.status).toBe('DEPRECATED');
    });
  });
});
