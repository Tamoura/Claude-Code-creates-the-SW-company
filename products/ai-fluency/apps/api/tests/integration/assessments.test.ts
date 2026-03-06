/**
 * tests/integration/assessments.test.ts — Assessment routes integration tests
 *
 * TDD RED phase: Tests written FIRST.
 * Implementation in src/routes/assessments.ts + src/services/assessment.service.ts
 *
 * Covers:
 * - POST /api/v1/assessment-sessions
 * - GET  /api/v1/assessment-sessions/:id
 * - POST /api/v1/assessment-sessions/:id/responses
 * - POST /api/v1/assessment-sessions/:id/complete
 * - GET  /api/v1/assessment-sessions/:id/results
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { createTestOrg, cleanupTestOrg, TestContext } from '../helpers/test-org';

describe('[ASSESSMENTS] Assessment Routes', () => {
  let app: FastifyInstance;
  let ctx: TestContext;
  let prisma: PrismaClient;
  let templateId: string;
  let algorithmVersion: number;
  let questionIds: string[];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    prisma = app.prisma as PrismaClient;
    ctx = await createTestOrg(app);

    // Seed algorithm version
    const algo = await prisma.algorithmVersion.upsert({
      where: { version: 1 },
      update: {},
      create: { version: 1, description: 'Test algorithm v1', isActive: true },
    });
    algorithmVersion = algo.version;

    // Seed assessment template for this org
    const template = await prisma.assessmentTemplate.create({
      data: {
        orgId: ctx.org.id,
        name: 'Test Assessment',
        description: 'Integration test template',
        roleProfile: 'GENERIC',
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

    // Seed behavioral indicators and questions (minimal set for testing)
    const dimensions = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'] as const;
    questionIds = [];

    for (const dim of dimensions) {
      // Upsert indicator to avoid conflicts with other test suites
      let indicator = await prisma.behavioralIndicator.findUnique({
        where: { shortCode: `${dim}_TEST_01` },
      });
      if (!indicator) {
        indicator = await prisma.behavioralIndicator.create({
          data: {
            shortCode: `${dim}_TEST_01`,
            name: `Test indicator for ${dim}`,
            description: `Test indicator description for ${dim}`,
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
            text: `Test question for ${dim}?`,
            optionsJson: [
              { key: 'A', text: 'Best answer', isCorrect: true, score: 1.0 },
              { key: 'B', text: 'Partial answer', isCorrect: false, score: 0.5 },
              { key: 'C', text: 'Wrong answer', isCorrect: false, score: 0.0 },
            ],
            isActive: true,
          },
        });
      }
      questionIds.push(question.id);
    }
  });

  afterAll(async () => {
    // Clean up seeded data
    await prisma.response.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.fluencyProfile.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.assessmentSession.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.question.deleteMany({
      where: { indicator: { shortCode: { endsWith: '_TEST_01' } } },
    });
    await prisma.behavioralIndicator.deleteMany({
      where: { shortCode: { endsWith: '_TEST_01' } },
    });
    await prisma.assessmentTemplate.deleteMany({ where: { orgId: ctx.org.id } });
    await cleanupTestOrg(ctx.org.id, prisma);
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/assessment-sessions
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/assessment-sessions', () => {
    test('creates session and returns session ID with questions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { templateId },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('sessionId');
      expect(body).toHaveProperty('questions');
      expect(Array.isArray(body.questions)).toBe(true);
      expect(body.questions.length).toBeGreaterThan(0);
      expect(body).toHaveProperty('totalQuestions');
    });

    test('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        payload: { templateId },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 400 for missing templateId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 404 for non-existent template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { templateId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/assessment-sessions/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/assessment-sessions/:id', () => {
    let sessionId: string;

    beforeAll(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { templateId },
      });
      sessionId = response.json().sessionId;
    });

    test('returns session with progress', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessment-sessions/${sessionId}`,
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('id', sessionId);
      expect(body).toHaveProperty('status', 'IN_PROGRESS');
      expect(body).toHaveProperty('progressPct', 0);
      expect(body).toHaveProperty('questions');
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessment-sessions/${sessionId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/assessment-sessions/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/assessment-sessions/:id/responses
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/assessment-sessions/:id/responses', () => {
    let sessionId: string;

    beforeAll(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { templateId },
      });
      sessionId = response.json().sessionId;
    });

    test('saves a response and updates progress', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/responses`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: {
          questionId: questionIds[0],
          answer: 'A',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('progressPct');
      expect(body.progressPct).toBeGreaterThan(0);
    });

    test('upserts on same question (idempotent)', async () => {
      // Save answer A first
      await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/responses`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: {
          questionId: questionIds[0],
          answer: 'A',
        },
      });

      // Save answer B for same question (should upsert)
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/responses`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: {
          questionId: questionIds[0],
          answer: 'B',
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify only one response exists for this question
      const responses = await prisma.response.findMany({
        where: { sessionId, questionId: questionIds[0] },
      });
      expect(responses).toHaveLength(1);
      expect(responses[0].answer).toBe('B');
    });

    test('returns 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/responses`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/responses`,
        payload: { questionId: questionIds[0], answer: 'A' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/assessment-sessions/:id/complete
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/assessment-sessions/:id/complete', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Create session
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { templateId },
      });
      sessionId = sessionRes.json().sessionId;

      // Answer all questions
      for (const qId of questionIds) {
        await app.inject({
          method: 'POST',
          url: `/api/v1/assessment-sessions/${sessionId}/responses`,
          headers: { authorization: `Bearer ${ctx.token}` },
          payload: { questionId: qId, answer: 'A' },
        });
      }
    });

    test('marks session complete and returns scored profile', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/complete`,
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('overallScore');
      expect(body).toHaveProperty('dimensionScores');
      expect(body).toHaveProperty('discernmentGap');
      expect(typeof body.overallScore).toBe('number');
      expect(body.overallScore).toBeGreaterThanOrEqual(0);
      expect(body.overallScore).toBeLessThanOrEqual(100);
    });

    test('returns 400 when completing an already completed session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/complete`,
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${sessionId}/complete`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/assessment-sessions/:id/results
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/assessment-sessions/:id/results', () => {
    let completedSessionId: string;

    beforeAll(async () => {
      // Create + answer + complete a session
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/v1/assessment-sessions',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { templateId },
      });
      completedSessionId = sessionRes.json().sessionId;

      for (const qId of questionIds) {
        await app.inject({
          method: 'POST',
          url: `/api/v1/assessment-sessions/${completedSessionId}/responses`,
          headers: { authorization: `Bearer ${ctx.token}` },
          payload: { questionId: qId, answer: 'A' },
        });
      }

      await app.inject({
        method: 'POST',
        url: `/api/v1/assessment-sessions/${completedSessionId}/complete`,
        headers: { authorization: `Bearer ${ctx.token}` },
      });
    });

    test('returns scored profile with AI feedback', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessment-sessions/${completedSessionId}/results`,
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('overallScore');
      expect(body).toHaveProperty('dimensionScores');
      expect(body).toHaveProperty('indicatorBreakdown');
    });

    test('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/assessment-sessions/00000000-0000-0000-0000-000000000000/results',
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(404);
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessment-sessions/${completedSessionId}/results`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
