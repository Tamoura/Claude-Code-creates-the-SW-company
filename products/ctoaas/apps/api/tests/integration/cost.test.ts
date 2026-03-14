/**
 * Cost Routes Integration Tests (Red Phase)
 *
 * Implements:
 *   FR-023 (TCO Calculator)
 *   FR-027 (Cloud Spend Analysis)
 *
 * These tests define expected behavior for cost and cloud spend routes.
 * They WILL FAIL because the routes do not exist yet.
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
  createTestUser,
  authHeaders,
  TestUser,
} from '../helpers';

// ---------- helpers ----------

const COST_BASE = '/api/v1/costs';

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

  afterEach(async () => {
    await cleanDatabase();
  });

  // ==========================================================
  // POST /api/v1/costs/tco
  // ==========================================================
  describe('POST /api/v1/costs/tco', () => {
    test('[FR-023][AC-7] creates TCO comparison with options', async () => {
      const user = await createTestUser(app);

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
      const user = await createTestUser(app);

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
      const user = await createTestUser(app);

      // Create a TCO comparison first
      const createRes = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user.accessToken),
        payload: tcoPayload(),
      });
      const created = JSON.parse(createRes.body);

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

    test('[FR-023] returns 404 for non-existent/other-user TCO', async () => {
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      // Create TCO as user1
      const createRes = await app.inject({
        method: 'POST',
        url: `${COST_BASE}/tco`,
        headers: authHeaders(user1.accessToken),
        payload: tcoPayload(),
      });
      const created = JSON.parse(createRes.body);

      // User2 tries to fetch user1's TCO
      const res = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/tco/${created.data.id}`,
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(404);

      // Non-existent ID
      const res2 = await app.inject({
        method: 'GET',
        url: `${COST_BASE}/tco/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res2.statusCode).toBe(404);
    });
  });

  // ==========================================================
  // GET /api/v1/costs/tco
  // ==========================================================
  describe('GET /api/v1/costs/tco', () => {
    test('[FR-023] lists user TCO comparisons', async () => {
      const user = await createTestUser(app);

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
      const user = await createTestUser(app);

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
      const user = await createTestUser(app);

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
      const user = await createTestUser(app);

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
