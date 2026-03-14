/**
 * Cost Routes Integration Tests
 *
 * Implements:
 *   FR-023 (TCO Calculator)
 *   FR-027 (Cloud Spend Analysis)
 *
 * [IMPL-059]
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
const COST_BASE = '/api/v1/costs';

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
  const email = `cost-test-${userCounter}-${Date.now()}@example.com`;
  const password = 'Str0ng!Pass#2026';

  const signupRes = await app.inject({
    method: 'POST',
    url: `${AUTH_BASE}/signup`,
    payload: {
      name: `Cost Test User ${userCounter}`,
      email,
      password,
      companyName: `CostTestCo ${userCounter}`,
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

function tcoPayload() {
  return {
    title: 'CRM Platform Evaluation',
    options: [
      {
        name: 'Build In-House',
        upfrontCost: 50000,
        monthlyCost: 5000,
        teamSize: 3,
        hourlyRate: 75,
        months: 6,
        scalingFactor: 1.1,
      },
      {
        name: 'Buy SaaS',
        upfrontCost: 0,
        monthlyCost: 15000,
        teamSize: 1,
        hourlyRate: 75,
        months: 2,
        scalingFactor: 1.05,
      },
    ],
  };
}

function cloudSpendPayload() {
  return {
    provider: 'AWS',
    spendBreakdown: {
      compute: 4500,
      storage: 1200,
      networking: 800,
      database: 2000,
      other: 500,
    },
    totalMonthly: 9000,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
  };
}

// ---------- suite ----------

describe('Cost Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

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

  // ==========================================================
  // POST /api/v1/costs/tco
  // ==========================================================
  describe('POST /api/v1/costs/tco', () => {
    test('[FR-023][AC-7] creates TCO comparison with options', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
        payload: tcoPayload(),
      });

      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('CRM Platform Evaluation');
      expect(body.data.projections).toBeDefined();
      expect(body.data.projections.options).toHaveLength(2);
      expect(body.data.projections.cheapest).toBeDefined();

      // Verify each option has 3-year breakdown
      for (const opt of body.data.projections.options) {
        expect(opt.name).toBeDefined();
        expect(opt.totalCost).toBeGreaterThan(0);
        expect(opt.years).toHaveLength(3);
      }

      // Verify persisted in DB
      const dbRecord = await prisma.tcoComparison.findUnique({
        where: { id: body.data.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.title).toBe('CRM Platform Evaluation');
    });

    test('[FR-023] requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        payload: tcoPayload(),
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-023] validates option structure', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
        payload: {
          title: 'Bad Options',
          options: [
            {
              // Missing required fields
              name: 'Incomplete',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // GET /api/v1/costs/tco/:id
  // ==========================================================
  describe('GET /api/v1/costs/tco/:id', () => {
    test('[FR-023][AC-8] returns TCO with projections', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Create a TCO comparison first
      const createRes = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
        payload: tcoPayload(),
      });
      const created = JSON.parse(createRes.body);
      expect(created.success).toBe(true);

      // Fetch it
      const res = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/tco/${created.data.id}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(created.data.id);
      expect(body.data.title).toBe('CRM Platform Evaluation');
      expect(body.data.projections).toBeDefined();
      expect(body.data.projections.options).toHaveLength(2);
    });

    test('[FR-023] returns 404 for non-existent TCO', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/tco/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    test('[FR-023] scopes TCO to owning user', async () => {
      const user1 = await createAuthenticatedUser(app, prisma);

      // Create TCO as user1
      const createRes = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user1.accessToken),
        payload: tcoPayload(),
      });
      const created = JSON.parse(createRes.body);
      expect(created.success).toBe(true);

      // Seed a second user directly via Prisma (avoids auth FK issue)
      const user2Org = await prisma.organization.create({
        data: { name: 'OtherOrg', industry: 'tech', employeeCount: 10, growthStage: 'SEED' },
      });
      const user2Record = await prisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          passwordHash: 'not-used',
          name: 'Other User',
          organizationId: user2Org.id,
        },
      });

      // Create a TCO for user2 directly in DB
      const user2Tco = await prisma.tcoComparison.create({
        data: {
          userId: user2Record.id,
          title: 'Other User TCO',
          options: [{ name: 'X', upfrontCost: 0, monthlyCost: 100, teamSize: 1, hourlyRate: 50, months: 1, scalingFactor: 1.0 }],
        },
      });

      // User1 should NOT see user2's TCO
      const res = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/tco/${user2Tco.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==========================================================
  // GET /api/v1/costs/tco
  // ==========================================================
  describe('GET /api/v1/costs/tco', () => {
    test('[FR-023] lists user TCO comparisons', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Create two TCO comparisons
      await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
        payload: tcoPayload(),
      });

      await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
        payload: {
          title: 'Second Comparison',
          options: [
            {
              name: 'Option A',
              upfrontCost: 1000,
              monthlyCost: 500,
              teamSize: 1,
              hourlyRate: 50,
              months: 3,
              scalingFactor: 1.0,
            },
          ],
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.comparisons).toBeDefined();
      expect(body.data.comparisons).toHaveLength(2);

      // Each should have id, title, createdAt
      for (const comp of body.data.comparisons) {
        expect(comp.id).toBeDefined();
        expect(comp.title).toBeDefined();
        expect(comp.createdAt).toBeDefined();
      }
    });
  });

  // ==========================================================
  // POST /api/v1/costs/cloud-spend
  // ==========================================================
  describe('POST /api/v1/costs/cloud-spend', () => {
    test('[FR-027][AC-5] creates cloud spend entry', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/cloud-spend`,
        headers: authHeaders(user.accessToken),
        payload: cloudSpendPayload(),
      });

      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.provider).toBe('AWS');
      expect(body.data.totalMonthly).toBeDefined();
      expect(body.data.spendBreakdown).toBeDefined();

      // Verify persisted in DB
      const dbRecord = await prisma.cloudSpend.findUnique({
        where: { id: body.data.id },
      });
      expect(dbRecord).not.toBeNull();
    });

    test('[FR-027] requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/cloud-spend`,
        payload: cloudSpendPayload(),
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // GET /api/v1/costs/cloud-spend
  // ==========================================================
  describe('GET /api/v1/costs/cloud-spend', () => {
    test('[FR-027] lists cloud spend entries for org', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Create two entries
      await app.inject({
        method: 'POST',
        url: `${COST_BASE}/cloud-spend`,
        headers: authHeaders(user.accessToken),
        payload: cloudSpendPayload(),
      });

      await app.inject({
        method: 'POST',
        url: `${COST_BASE}/cloud-spend`,
        headers: authHeaders(user.accessToken),
        payload: {
          ...cloudSpendPayload(),
          periodStart: '2026-02-01',
          periodEnd: '2026-02-28',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/cloud-spend`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.entries).toBeDefined();
      expect(body.data.entries).toHaveLength(2);
    });
  });

  // ==========================================================
  // POST /api/v1/costs/cloud-spend/analyze
  // ==========================================================
  describe('POST /api/v1/costs/cloud-spend/analyze', () => {
    test('[FR-027][AC-6] returns benchmarks and recommendations', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/cloud-spend/analyze`,
        headers: authHeaders(user.accessToken),
        payload: {
          provider: 'AWS',
          spendBreakdown: {
            compute: 4500,
            storage: 1200,
            networking: 800,
            database: 2000,
            other: 500,
          },
          totalMonthly: 9000,
          companySize: 50,
        },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.benchmarks).toBeDefined();
      expect(body.data.recommendations).toBeDefined();
      expect(Array.isArray(body.data.recommendations)).toBe(true);

      // Benchmarks should have per-category data
      expect(body.data.benchmarks.compute).toBeDefined();
      expect(body.data.benchmarks.totalMedian).toBeDefined();
    });
  });
});
