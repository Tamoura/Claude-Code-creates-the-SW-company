/**
 * tests/integration/profiles.test.ts — Profile routes integration tests
 *
 * TDD RED phase: Tests written FIRST.
 * Implementation in src/routes/profiles.ts
 *
 * Covers:
 * - GET /api/v1/profiles/me     — Current user's latest fluency profile
 * - GET /api/v1/profiles/history — All assessment history
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { createTestOrg, cleanupTestOrg, TestContext } from '../helpers/test-org';

describe('[PROFILES] Profile Routes', () => {
  let app: FastifyInstance;
  let ctx: TestContext;
  let prisma: PrismaClient;
  let templateId: string;
  let questionIds: string[];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    prisma = app.prisma as PrismaClient;
    ctx = await createTestOrg(app);

    // Seed algorithm version
    await prisma.algorithmVersion.upsert({
      where: { version: 1 },
      update: {},
      create: { version: 1, description: 'Test algorithm v1', isActive: true },
    });

    // Seed template
    const template = await prisma.assessmentTemplate.create({
      data: {
        orgId: ctx.org.id,
        name: 'Profile Test Template',
        dimensionWeights: {
          DELEGATION: 0.25,
          DESCRIPTION: 0.25,
          DISCERNMENT: 0.25,
          DILIGENCE: 0.25,
        },
        isActive: true,
      },
    });
    templateId = template.id;

    // Seed indicators and questions
    const dimensions = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'] as const;
    questionIds = [];

    for (const dim of dimensions) {
      // Check if indicator already exists (from assessment tests)
      let indicator = await prisma.behavioralIndicator.findUnique({
        where: { shortCode: `${dim}_TEST_01` },
      });
      if (!indicator) {
        indicator = await prisma.behavioralIndicator.create({
          data: {
            shortCode: `${dim}_TEST_01`,
            name: `Test indicator for ${dim}`,
            description: `Test`,
            dimension: dim,
            track: 'OBSERVABLE',
            prevalenceWeight: 1.0,
            sortOrder: 1,
          },
        });
      }

      let question = await prisma.question.findFirst({
        where: { indicatorId: indicator.id },
      });
      if (!question) {
        question = await prisma.question.create({
          data: {
            dimension: dim,
            interactionMode: 'AUTOMATION',
            questionType: 'SCENARIO',
            indicatorId: indicator.id,
            text: `Profile test question for ${dim}?`,
            optionsJson: [
              { key: 'A', text: 'Best', isCorrect: true, score: 1.0 },
              { key: 'B', text: 'Partial', isCorrect: false, score: 0.5 },
            ],
            isActive: true,
          },
        });
      }
      questionIds.push(question.id);
    }

    // Create a completed assessment so profiles exist
    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/v1/assessment-sessions',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: { templateId },
    });
    const sessionId = sessionRes.json().sessionId;

    for (const qId of questionIds) {
      await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/responses`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { questionId: qId, answer: 'A' },
      });
    }

    await app.inject({
      method: 'POST',
      url: `/api/v1/assessment-sessions/${sessionId}/complete`,
      headers: { authorization: `Bearer ${ctx.token}` },
    });
  });

  afterAll(async () => {
    await prisma.fluencyProfile.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.response.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.assessmentSession.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.assessmentTemplate.deleteMany({ where: { orgId: ctx.org.id } });
    await cleanupTestOrg(ctx.org.id, prisma);
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/profiles/me
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/profiles/me', () => {
    test('returns latest fluency profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('overallScore');
      expect(body).toHaveProperty('dimensionScores');
      expect(body).toHaveProperty('discernmentGap');
      expect(typeof body.overallScore).toBe('number');
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 404 for user with no profile', async () => {
      // Create a new user with no assessments
      const noProfileUser = await prisma.user.create({
        data: {
          orgId: ctx.org.id,
          email: `noprofile-${Date.now()}@test.example.com`,
          firstName: 'No',
          lastName: 'Profile',
          role: 'LEARNER',
          status: 'ACTIVE',
        },
      });

      const token = app.jwt.sign(
        { sub: noProfileUser.id, orgId: ctx.org.id, role: 'LEARNER' },
        { expiresIn: '15m' }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);

      await prisma.user.delete({ where: { id: noProfileUser.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/profiles/history
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/profiles/history', () => {
    test('returns all profiles for current user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/history',
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0]).toHaveProperty('overallScore');
      expect(body).toHaveProperty('total');
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/history',
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns empty data array for user with no history', async () => {
      const newUser = await prisma.user.create({
        data: {
          orgId: ctx.org.id,
          email: `nohistory-${Date.now()}@test.example.com`,
          firstName: 'No',
          lastName: 'History',
          role: 'LEARNER',
          status: 'ACTIVE',
        },
      });

      const token = app.jwt.sign(
        { sub: newUser.id, orgId: ctx.org.id, role: 'LEARNER' },
        { expiresIn: '15m' }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/history',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);

      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });
});
