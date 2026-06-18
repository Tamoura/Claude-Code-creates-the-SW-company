/**
 * Risk Routes Integration Tests (Red Phase)
 *
 * Implements:
 *   FR-020 (Risk Dashboard & Scoring)
 *   FR-021 (Risk Generation from Company Profile)
 *
 * These tests define expected behavior for risk routes.
 * They WILL FAIL because the routes do not exist yet.
 *
 * [IMPL-050]
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
const RISK_BASE = '/api/v1/risks';

interface AuthenticatedUser {
  id: string;
  email: string;
  accessToken: string;
  organizationId: string;
}

let userCounter = 0;

/**
 * Creates a real user via signup + login flow and returns
 * an access token for authenticated requests.
 */
async function createAuthenticatedUser(
  app: FastifyInstance,
  prisma: PrismaClient
): Promise<AuthenticatedUser> {
  userCounter++;
  const email = `risk-test-${userCounter}-${Date.now()}@example.com`;
  const password = 'Str0ng!Pass#2026';

  // Signup
  const signupRes = await app.inject({
    method: 'POST',
    url: `${AUTH_BASE}/signup`,
    payload: {
      name: `Risk Test User ${userCounter}`,
      email,
      password,
      companyName: `RiskTestCo ${userCounter}`,
    },
  });
  expect(signupRes.statusCode).toBe(201);

  // Login to get access token
  const loginRes = await app.inject({
    method: 'POST',
    url: `${AUTH_BASE}/login`,
    payload: { email, password },
  });
  expect(loginRes.statusCode).toBe(200);

  const loginBody = JSON.parse(loginRes.body);
  const accessToken = loginBody.data.accessToken;
  const userId = loginBody.data.user.id;

  // Get organizationId from DB
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

/**
 * Seeds risk items directly into the database for a given organization.
 */
async function seedRiskItems(
  prisma: PrismaClient,
  organizationId: string
): Promise<string[]> {
  const items = [
    {
      organizationId,
      category: 'TECH_DEBT' as const,
      title: 'Python 2.7 past EOL',
      description: 'Python 2.7 reached end-of-life in January 2020',
      severity: 9,
      trend: 'WORSENING' as const,
      status: 'ACTIVE' as const,
      mitigations: JSON.stringify([]),
      affectedSystems: JSON.stringify(['backend-api', 'data-pipeline']),
    },
    {
      organizationId,
      category: 'TECH_DEBT' as const,
      title: 'AngularJS deprecated',
      description: 'AngularJS is no longer maintained',
      severity: 7,
      trend: 'STABLE' as const,
      status: 'ACTIVE' as const,
      mitigations: JSON.stringify(['Migration plan drafted']),
      affectedSystems: JSON.stringify(['frontend']),
    },
    {
      organizationId,
      category: 'VENDOR' as const,
      title: 'Single cloud provider dependency',
      description: 'All infrastructure runs on a single cloud provider',
      severity: 6,
      trend: 'STABLE' as const,
      status: 'ACTIVE' as const,
      mitigations: JSON.stringify([]),
      affectedSystems: JSON.stringify(['infrastructure']),
    },
    {
      organizationId,
      category: 'COMPLIANCE' as const,
      title: 'Missing SOC2 certification',
      description: 'No SOC2 audit completed yet',
      severity: 8,
      trend: 'STABLE' as const,
      status: 'ACTIVE' as const,
      mitigations: JSON.stringify([]),
      affectedSystems: JSON.stringify(['security', 'operations']),
    },
    {
      organizationId,
      category: 'OPERATIONAL' as const,
      title: 'No disaster recovery plan',
      description: 'No documented or tested DR process exists',
      severity: 7,
      trend: 'WORSENING' as const,
      status: 'ACTIVE' as const,
      mitigations: JSON.stringify([]),
      affectedSystems: JSON.stringify(['infrastructure', 'data']),
    },
    {
      organizationId,
      category: 'TECH_DEBT' as const,
      title: 'Legacy jQuery dependency',
      description: 'jQuery 2.x still used in admin panel',
      severity: 4,
      trend: 'IMPROVING' as const,
      status: 'MITIGATED' as const,
      mitigations: JSON.stringify(['Replaced in 60% of pages']),
      affectedSystems: JSON.stringify(['admin-panel']),
    },
  ];

  const ids: string[] = [];
  for (const item of items) {
    const created = await prisma.riskItem.create({ data: item });
    ids.push(created.id);
  }
  return ids;
}

/**
 * Seeds a complete company profile so risk generation has data to work with.
 */
async function seedCompanyProfile(
  app: FastifyInstance,
  user: AuthenticatedUser
): Promise<void> {
  // Complete onboarding step 1 (company basics)
  await app.inject({
    method: 'PUT',
    url: '/api/v1/onboarding/step/1',
    headers: authHeaders(user.accessToken),
    payload: {
      industry: 'fintech',
      employeeCount: 15,
      growthStage: 'SERIES_A',
      foundedYear: 2018,
    },
  });

  // Complete onboarding step 2 (tech stack)
  await app.inject({
    method: 'PUT',
    url: '/api/v1/onboarding/step/2',
    headers: authHeaders(user.accessToken),
    payload: {
      languages: ['Python 2.7', 'JavaScript'],
      frameworks: ['AngularJS', 'Express'],
      databases: ['MySQL 5.5'],
      cloudProvider: 'AWS',
    },
  });

  // Complete onboarding step 3 (challenges)
  await app.inject({
    method: 'PUT',
    url: '/api/v1/onboarding/step/3',
    headers: authHeaders(user.accessToken),
    payload: {
      challenges: ['technical-debt', 'scaling-infrastructure'],
    },
  });
}

// ---------- suite ----------

describe('Risk Routes', () => {
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
  // GET /api/v1/risks
  // ==========================================================
  describe('GET /api/v1/risks', () => {
    test('[FR-020][AC-6] returns risk summary with 4 category scores', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      await seedRiskItems(prisma, user.organizationId);

      const res = await app.inject({
        method: 'GET',
        url: RISK_BASE,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.summary).toBeDefined();
      expect(body.data.summary).toHaveLength(4);

      const categories = body.data.summary.map(
        (s: { category: string }) => s.category
      );
      expect(categories).toContain('TECH_DEBT');
      expect(categories).toContain('VENDOR');
      expect(categories).toContain('COMPLIANCE');
      expect(categories).toContain('OPERATIONAL');

      // Each summary item should have score, trend, and activeCount
      for (const item of body.data.summary) {
        expect(typeof item.score).toBe('number');
        expect(typeof item.trend).toBe('string');
        expect(typeof item.activeCount).toBe('number');
      }
    });

    test('[FR-020] requires authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: RISK_BASE,
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-020] scopes risks to user organization', async () => {
      const user1 = await createAuthenticatedUser(app, prisma);
      const user2 = await createAuthenticatedUser(app, prisma);

      // Seed risks only for user1's org
      await seedRiskItems(prisma, user1.organizationId);

      // User2 should see empty risk summary (score 0 for all categories)
      const res = await app.inject({
        method: 'GET',
        url: RISK_BASE,
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // All scores should be 0 since user2's org has no risks
      for (const item of body.data.summary) {
        expect(item.score).toBe(0);
        expect(item.activeCount).toBe(0);
      }
    });
  });

  // ==========================================================
  // GET /api/v1/risks/:category
  // ==========================================================
  describe('GET /api/v1/risks/:category', () => {
    test('[FR-020][AC-7] returns risk items for specific category', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      await seedRiskItems(prisma, user.organizationId);

      const res = await app.inject({
        method: 'GET',
        url: `${RISK_BASE}/tech-debt`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.items).toBeDefined();
      expect(Array.isArray(body.data.items)).toBe(true);

      // Should return tech-debt items (active + mitigated = 3 total)
      for (const item of body.data.items) {
        expect(item.category).toBe('TECH_DEBT');
        expect(item.title).toBeDefined();
        expect(typeof item.severity).toBe('number');
      }
    });

    test('[FR-020] filters by status (active/mitigated/dismissed)', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      await seedRiskItems(prisma, user.organizationId);

      // Filter for active tech-debt risks only
      const res = await app.inject({
        method: 'GET',
        url: `${RISK_BASE}/tech-debt?status=active`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Should only return active tech-debt (2 items, not the mitigated one)
      for (const item of body.data.items) {
        expect(item.status).toBe('ACTIVE');
      }
      expect(body.data.items.length).toBe(2);
    });

    test('[FR-020] sorts by severity descending', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      await seedRiskItems(prisma, user.organizationId);

      const res = await app.inject({
        method: 'GET',
        url: `${RISK_BASE}/tech-debt`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      const items = body.data.items;

      // Items should be sorted by severity descending
      for (let i = 1; i < items.length; i++) {
        expect(items[i - 1].severity).toBeGreaterThanOrEqual(
          items[i].severity
        );
      }
    });
  });

  // ==========================================================
  // GET /api/v1/risks/items/:id
  // ==========================================================
  describe('GET /api/v1/risks/items/:id', () => {
    test('[FR-020] returns risk item detail with recommendations', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const riskIds = await seedRiskItems(prisma, user.organizationId);

      const res = await app.inject({
        method: 'GET',
        url: `${RISK_BASE}/items/${riskIds[0]}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(riskIds[0]);
      expect(body.data.title).toBeDefined();
      expect(body.data.description).toBeDefined();
      expect(body.data.severity).toBeDefined();
      expect(body.data.category).toBeDefined();
      expect(body.data.trend).toBeDefined();
      expect(body.data.status).toBeDefined();
      expect(body.data.affectedSystems).toBeDefined();
      expect(body.data.mitigations).toBeDefined();
    });

    test('[FR-020] returns 404 for non-existent risk', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'GET',
        url: `${RISK_BASE}/items/00000000-0000-0000-0000-000000000000`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-020] prevents accessing other org risk items', async () => {
      const user1 = await createAuthenticatedUser(app, prisma);
      const user2 = await createAuthenticatedUser(app, prisma);

      // Seed risks for user1's org
      const riskIds = await seedRiskItems(prisma, user1.organizationId);

      // User2 should NOT be able to access user1's risk items
      const res = await app.inject({
        method: 'GET',
        url: `${RISK_BASE}/items/${riskIds[0]}`,
        headers: authHeaders(user2.accessToken),
      });

      // Should return 404 (not 403) to prevent enumeration
      expect(res.statusCode).toBe(404);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // PATCH /api/v1/risks/items/:id/status
  // ==========================================================
  describe('PATCH /api/v1/risks/items/:id/status', () => {
    test('[FR-020][AC-8] updates risk item status', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const riskIds = await seedRiskItems(prisma, user.organizationId);

      const res = await app.inject({
        method: 'PATCH',
        url: `${RISK_BASE}/items/${riskIds[0]}/status`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'MITIGATED' },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('MITIGATED');

      // Verify in DB
      const updated = await prisma.riskItem.findUnique({
        where: { id: riskIds[0] },
      });
      expect(updated!.status).toBe('MITIGATED');
    });

    test('[FR-020] returns 400 for invalid status transition', async () => {
      const user = await createAuthenticatedUser(app, prisma);
      const riskIds = await seedRiskItems(prisma, user.organizationId);

      const res = await app.inject({
        method: 'PATCH',
        url: `${RISK_BASE}/items/${riskIds[0]}/status`,
        headers: authHeaders(user.accessToken),
        payload: { status: 'INVALID_STATUS' },
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-020] requires authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `${RISK_BASE}/items/some-id/status`,
        payload: { status: 'MITIGATED' },
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // POST /api/v1/risks/generate
  // ==========================================================
  describe('POST /api/v1/risks/generate', () => {
    test('[FR-021][AC-5] generates risks from company profile', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // First seed a complete company profile
      await seedCompanyProfile(app, user);

      const res = await app.inject({
        method: 'POST',
        url: `${RISK_BASE}/generate`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.generated).toBeDefined();
      expect(typeof body.data.generated).toBe('number');
      expect(body.data.generated).toBeGreaterThan(0);

      // Verify risks were created in DB
      const dbRisks = await prisma.riskItem.findMany({
        where: { organizationId: user.organizationId },
      });
      expect(dbRisks.length).toBe(body.data.generated);
    });

    test('[FR-021] requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${RISK_BASE}/generate`,
        payload: {},
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });
});
