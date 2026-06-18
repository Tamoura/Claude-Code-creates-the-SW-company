/**
 * Profile & Onboarding Routes Integration Tests (Red Phase)
 *
 * Implements:
 *   US-05  (Onboarding Wizard)
 *   FR-008 (Company Profile)
 *   FR-009 (Profile Completeness)
 *
 * These tests define expected behavior for profile and onboarding
 * routes. They WILL FAIL because the routes do not exist yet.
 *
 * [IMPL-014]
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
const ONBOARDING_BASE = '/api/v1/onboarding';
const PROFILE_BASE = '/api/v1/profile';

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
  const email = `profile-test-${userCounter}-${Date.now()}@example.com`;
  const password = 'Str0ng!Pass#2026';

  // Signup
  const signupRes = await app.inject({
    method: 'POST',
    url: `${AUTH_BASE}/signup`,
    payload: {
      name: `Test User ${userCounter}`,
      email,
      password,
      companyName: `TestCo ${userCounter}`,
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

// Step payloads for the 4-step onboarding wizard
const step1Payload = {
  industry: 'fintech',
  employeeCount: 50,
  growthStage: 'SERIES_A',
  foundedYear: 2020,
};

const step2Payload = {
  languages: ['TypeScript', 'Python'],
  frameworks: ['React', 'Fastify'],
  databases: ['PostgreSQL', 'Redis'],
  cloudProvider: 'AWS',
};

const step3Payload = {
  challenges: [
    'scaling-infrastructure',
    'hiring-senior-engineers',
    'technical-debt',
  ],
  customChallenges: 'Migrating from monolith to microservices',
};

const step4Payload = {
  communicationStyle: 'direct',
  responseFormat: 'structured',
  detailLevel: 'detailed',
};

// ---------- suite ----------

describe('Profile Routes', () => {
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
  // GET /api/v1/onboarding/step/:step
  // ==========================================================
  describe('GET /api/v1/onboarding/step/:step', () => {
    test('[US-05][AC-1] returns current step data for authenticated user', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'GET',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.step).toBe(1);
    });

    test('[US-05] returns 401 for unauthenticated request', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${ONBOARDING_BASE}/step/1`,
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[US-05] returns 400 for invalid step number', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'GET',
        url: `${ONBOARDING_BASE}/step/99`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // PUT /api/v1/onboarding/step/:step
  // ==========================================================
  describe('PUT /api/v1/onboarding/step/:step', () => {
    test('[US-05][AC-2] saves step 1 (company basics): industry, employeeCount, growthStage, foundedYear', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: step1Payload,
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify the organization was updated in DB
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      expect(org).not.toBeNull();
      expect(org!.industry).toBe(step1Payload.industry);
      expect(org!.employeeCount).toBe(step1Payload.employeeCount);
      expect(org!.growthStage).toBe(step1Payload.growthStage);
      expect(org!.foundedYear).toBe(step1Payload.foundedYear);
    });

    test('[US-05][AC-3] saves step 2 (tech stack): languages, frameworks, databases, cloudProvider', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/2`,
        headers: authHeaders(user.accessToken),
        payload: step2Payload,
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify CompanyProfile was updated
      const profile = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      expect(profile).not.toBeNull();
      expect(profile!.techStack).toMatchObject({
        languages: step2Payload.languages,
        frameworks: step2Payload.frameworks,
        databases: step2Payload.databases,
      });
      expect(profile!.cloudProvider).toBe(step2Payload.cloudProvider);
    });

    test('[US-05][AC-4] saves step 3 (challenges): selected challenges + custom', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/3`,
        headers: authHeaders(user.accessToken),
        payload: step3Payload,
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify challenges stored on Organization
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      expect(org).not.toBeNull();
      const challenges = org!.challenges as string[];
      expect(challenges).toEqual(
        expect.arrayContaining(step3Payload.challenges)
      );
    });

    test('[US-05][AC-5] saves step 4 (preferences): communicationStyle, responseFormat, detailLevel', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/4`,
        headers: authHeaders(user.accessToken),
        payload: step4Payload,
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify preferences stored (via UserPreference model)
      const prefs = await prisma.userPreference.findMany({
        where: { userId: user.id },
      });
      expect(prefs.length).toBeGreaterThanOrEqual(3);

      const prefMap = new Map(
        prefs.map((p) => [p.preferenceKey, p.preferenceValue])
      );
      expect(prefMap.get('communicationStyle')).toBe('direct');
      expect(prefMap.get('responseFormat')).toBe('structured');
      expect(prefMap.get('detailLevel')).toBe('detailed');
    });

    test('[US-05][AC-6] advances onboarding currentStep after saving', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Save step 1
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: step1Payload,
      });

      // Check onboarding state advanced to step 2
      const profile = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      expect(profile).not.toBeNull();

      const state = profile!.onboardingState as {
        currentStep: number;
        completed: boolean;
      };
      expect(state.currentStep).toBe(2);
      expect(state.completed).toBe(false);
    });

    test('[US-05][AC-7] can resume from last incomplete step', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Complete steps 1 and 2
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: step1Payload,
      });
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/2`,
        headers: authHeaders(user.accessToken),
        payload: step2Payload,
      });

      // GET should return step 3 as current
      const res = await app.inject({
        method: 'GET',
        url: `${ONBOARDING_BASE}/step/3`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.step).toBe(3);
    });

    test('[US-05] skipping a step advances to next', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Skip step 1 by saving empty/minimal data
      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      // Should still advance (step is optional or has defaults)
      expect(res.statusCode).toBe(200);

      const profile = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      const state = profile!.onboardingState as {
        currentStep: number;
      };
      expect(state.currentStep).toBeGreaterThanOrEqual(2);
    });

    test('[US-05] returns 400 for invalid step data', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: {
          employeeCount: -5, // invalid: negative
          growthStage: 'INVALID_STAGE',
        },
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // PUT /api/v1/onboarding/complete
  // ==========================================================
  describe('PUT /api/v1/onboarding/complete', () => {
    test('[US-05][AC-8] marks onboarding as completed', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Complete all 4 steps
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: step1Payload,
      });
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/2`,
        headers: authHeaders(user.accessToken),
        payload: step2Payload,
      });
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/3`,
        headers: authHeaders(user.accessToken),
        payload: step3Payload,
      });
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/4`,
        headers: authHeaders(user.accessToken),
        payload: step4Payload,
      });

      // Mark complete
      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/complete`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify onboarding state in DB
      const profile = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      const state = profile!.onboardingState as {
        currentStep: number;
        completed: boolean;
      };
      expect(state.completed).toBe(true);
    });

    test('[US-05] returns 400 if not all steps done', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // Only complete step 1
      await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/step/1`,
        headers: authHeaders(user.accessToken),
        payload: step1Payload,
      });

      // Try to mark complete without doing all steps
      const res = await app.inject({
        method: 'PUT',
        url: `${ONBOARDING_BASE}/complete`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // GET /api/v1/profile/company
  // ==========================================================
  describe('GET /api/v1/profile/company', () => {
    test('[FR-008][AC-1] returns company profile for authenticated user', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'GET',
        url: `${PROFILE_BASE}/company`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.organizationId).toBe(user.organizationId);
      expect(body.data.techStack).toBeDefined();
      expect(body.data.profileCompleteness).toBeDefined();
    });

    test('[FR-008] returns 401 for unauthenticated request', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${PROFILE_BASE}/company`,
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // PUT /api/v1/profile/company
  // ==========================================================
  describe('PUT /api/v1/profile/company', () => {
    test('[FR-008][AC-2] updates company profile fields', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'PUT',
        url: `${PROFILE_BASE}/company`,
        headers: authHeaders(user.accessToken),
        payload: {
          architectureNotes: 'Microservices with event sourcing',
          constraints: 'HIPAA compliant, SOC2 required',
          cloudProvider: 'GCP',
        },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify DB
      const profile = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      expect(profile).not.toBeNull();
      expect(profile!.architectureNotes).toBe(
        'Microservices with event sourcing'
      );
      expect(profile!.constraints).toBe(
        'HIPAA compliant, SOC2 required'
      );
      expect(profile!.cloudProvider).toBe('GCP');
    });

    test('[FR-008][AC-3] recalculates completeness after update', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      // First check baseline completeness
      const before = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      const baselineCompleteness = before?.profileCompleteness ?? 0;

      // Update profile with substantial data
      await app.inject({
        method: 'PUT',
        url: `${PROFILE_BASE}/company`,
        headers: authHeaders(user.accessToken),
        payload: {
          techStack: {
            languages: ['Go', 'Rust'],
            frameworks: ['Gin'],
            databases: ['CockroachDB'],
          },
          cloudProvider: 'GCP',
          architectureNotes: 'Event-driven microservices',
        },
      });

      const after = await prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });
      expect(after!.profileCompleteness).toBeGreaterThan(
        baselineCompleteness
      );
    });

    test('[FR-008] returns 401 for unauthenticated request', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `${PROFILE_BASE}/company`,
        payload: { cloudProvider: 'AWS' },
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // GET /api/v1/profile/completeness
  // ==========================================================
  describe('GET /api/v1/profile/completeness', () => {
    test('[FR-009][AC-1] returns completeness percentage', async () => {
      const user = await createAuthenticatedUser(app, prisma);

      const res = await app.inject({
        method: 'GET',
        url: `${PROFILE_BASE}/completeness`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(typeof body.data.completeness).toBe('number');
      expect(body.data.completeness).toBeGreaterThanOrEqual(0);
      expect(body.data.completeness).toBeLessThanOrEqual(100);
    });
  });
});
