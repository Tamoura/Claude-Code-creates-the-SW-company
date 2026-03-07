/**
 * tests/integration/profile.test.ts — Profile API integration tests
 *
 * Tests:
 *   GET /api/v1/profile          — get latest FluencyProfile
 *   GET /api/v1/profile/history  — get all past assessment results
 *
 * Uses real database — no mocks.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Profile API', () => {
  let app: FastifyInstance;
  let orgId: string;
  let orgSlug: string;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create org
    const org = await app.prisma.organization.create({
      data: {
        name: 'Profile Test Org',
        slug: `profile-test-org-${Date.now()}`,
        status: 'ACTIVE',
        plan: 'TRIAL',
      },
    });
    orgId = org.id;
    orgSlug = org.slug;

    // Algorithm version
    await app.prisma.algorithmVersion.upsert({
      where: { version: 1 },
      update: {},
      create: { version: 1, description: 'v1', isActive: true, activatedAt: new Date() },
    });

    // Create minimal indicators + questions
    const dims = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'] as const;
    for (let i = 0; i < dims.length; i++) {
      const ind = await app.prisma.behavioralIndicator.upsert({
        where: { shortCode: `PROFILE_${dims[i]}_01` },
        update: {},
        create: {
          shortCode: `PROFILE_${dims[i]}_01`,
          name: `Profile test ${dims[i]}`,
          description: `Profile test indicator for ${dims[i]}`,
          dimension: dims[i],
          track: 'OBSERVABLE',
          prevalenceWeight: 0.8,
          sortOrder: 100 + i,
        },
      });

      await app.prisma.question.create({
        data: {
          dimension: dims[i],
          interactionMode: 'AUGMENTATION',
          questionType: 'SCENARIO',
          indicatorId: ind.id,
          text: `Profile test question for ${dims[i]}`,
          optionsJson: [
            { key: 'A', text: 'Best', isCorrect: true, score: 1.0 },
            { key: 'B', text: 'OK', isCorrect: false, score: 0.5 },
            { key: 'C', text: 'Poor', isCorrect: false, score: 0.25 },
            { key: 'D', text: 'Wrong', isCorrect: false, score: 0.0 },
          ],
        },
      });
    }

    // Template
    await app.prisma.assessmentTemplate.create({
      data: {
        orgId: org.id,
        name: 'Profile Test Template',
        dimensionWeights: { DELEGATION: 0.25, DESCRIPTION: 0.25, DISCERNMENT: 0.25, DILIGENCE: 0.25 },
        isActive: true,
      },
    });

    // Register user
    const regResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `profile-${Date.now()}@test.example.com`,
        firstName: 'Profile',
        lastName: 'Tester',
        password: 'SecurePass123!@#',
        orgSlug,
      },
    });
    token = regResponse.json().token;
  });

  afterAll(async () => {
    await app.prisma.fluencyProfile.deleteMany({ where: { orgId } });
    await app.prisma.response.deleteMany({ where: { orgId } });
    await app.prisma.assessmentSession.deleteMany({ where: { orgId } });
    await app.prisma.assessmentTemplate.deleteMany({ where: { orgId } });
    const profileInds = await app.prisma.behavioralIndicator.findMany({
      where: { shortCode: { startsWith: 'PROFILE_' } },
    });
    for (const ind of profileInds) {
      await app.prisma.question.deleteMany({ where: { indicatorId: ind.id } });
    }
    await app.prisma.behavioralIndicator.deleteMany({
      where: { shortCode: { startsWith: 'PROFILE_' } },
    });
    await app.prisma.userSession.deleteMany({ where: { orgId } });
    await app.prisma.user.deleteMany({ where: { orgId } });
    await app.prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  // Helper to complete an assessment
  async function completeAssessment(): Promise<void> {
    // Start
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    const startBody = startRes.json();
    const sessionId = startBody.session.id;

    // Get questions
    const qRes = await app.inject({
      method: 'GET',
      url: `/api/v1/assessments/${sessionId}/questions`,
      headers: { authorization: `Bearer ${token}` },
    });
    const questions = qRes.json().questions;

    // Submit responses
    const responses = questions.map((q: { id: string }) => ({
      questionId: q.id,
      answer: 'A',
    }));
    await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${sessionId}/responses`,
      headers: { authorization: `Bearer ${token}` },
      payload: { responses },
    });

    // Complete
    await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${sessionId}/complete`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  // ─────────────────────────────────────────────────────────
  // GET /api/v1/profile — no profile yet
  // ─────────────────────────────────────────────────────────

  describe('GET /api/v1/profile', () => {
    test('returns null profile when user has no assessment completed', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profile).toBeNull();
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────
  // After completing an assessment
  // ─────────────────────────────────────────────────────────

  describe('After completing an assessment', () => {
    beforeAll(async () => {
      await completeAssessment();
    });

    test('GET /api/v1/profile returns latest profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profile).toBeDefined();
      expect(body.profile).not.toBeNull();
      expect(body.profile.overallScore).toBeDefined();
      expect(typeof body.profile.overallScore).toBe('number');
      expect(body.profile.dimensionScores).toBeDefined();
    });

    test('GET /api/v1/profile/history returns all profiles', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/history',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profiles).toBeDefined();
      expect(Array.isArray(body.profiles)).toBe(true);
      expect(body.profiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Multiple assessments
  // ─────────────────────────────────────────────────────────

  describe('After completing multiple assessments', () => {
    beforeAll(async () => {
      await completeAssessment();
    });

    test('GET /api/v1/profile returns the most recent profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profile).toBeDefined();
      expect(body.profile).not.toBeNull();
    });

    test('GET /api/v1/profile/history returns multiple profiles ordered by date', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/history',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profiles.length).toBeGreaterThanOrEqual(2);

      // Should be ordered most recent first
      for (let i = 0; i < body.profiles.length - 1; i++) {
        const current = new Date(body.profiles[i].createdAt).getTime();
        const next = new Date(body.profiles[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });
});
