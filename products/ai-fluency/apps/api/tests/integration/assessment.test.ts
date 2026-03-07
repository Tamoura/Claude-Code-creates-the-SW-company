/**
 * tests/integration/assessment.test.ts — Assessment lifecycle integration tests
 *
 * Tests the full assessment flow:
 *   register -> start session -> get questions -> submit responses -> complete -> get results
 *
 * Uses real database — no mocks.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { PrismaClient } from '@prisma/client';

describe('Assessment API', () => {
  let app: FastifyInstance;
  let orgId: string;
  let orgSlug: string;
  let token: string;
  let userId: string;
  let templateId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create org
    const org = await app.prisma.organization.create({
      data: {
        name: 'Assessment Test Org',
        slug: `assessment-test-org-${Date.now()}`,
        status: 'ACTIVE',
        plan: 'TRIAL',
      },
    });
    orgId = org.id;
    orgSlug = org.slug;

    // Create algorithm version
    await app.prisma.algorithmVersion.upsert({
      where: { version: 1 },
      update: {},
      create: { version: 1, description: 'v1 scoring algorithm', isActive: true, activatedAt: new Date() },
    });

    // Create behavioral indicators (minimum set for testing)
    const indicators = [
      { shortCode: 'DELEGATION_01', name: 'Identify task suitability', description: 'Can identify tasks suitable for AI', dimension: 'DELEGATION' as const, track: 'OBSERVABLE' as const, prevalenceWeight: 0.8, sortOrder: 1 },
      { shortCode: 'DELEGATION_02', name: 'Set constraints', description: 'Sets appropriate constraints', dimension: 'DELEGATION' as const, track: 'OBSERVABLE' as const, prevalenceWeight: 0.7, sortOrder: 2 },
      { shortCode: 'DESCRIPTION_01', name: 'Write clear prompts', description: 'Writes clear, structured prompts', dimension: 'DESCRIPTION' as const, track: 'OBSERVABLE' as const, prevalenceWeight: 0.9, sortOrder: 3 },
      { shortCode: 'DISCERNMENT_01', name: 'Evaluate AI output', description: 'Critically evaluates AI output', dimension: 'DISCERNMENT' as const, track: 'OBSERVABLE' as const, prevalenceWeight: 0.85, sortOrder: 4 },
      { shortCode: 'DILIGENCE_01', name: 'Verify facts', description: 'Verifies facts in AI output', dimension: 'DILIGENCE' as const, track: 'OBSERVABLE' as const, prevalenceWeight: 0.75, sortOrder: 5 },
      { shortCode: 'DELEGATION_SR_01', name: 'Self-report: delegation comfort', description: 'How comfortable delegating to AI', dimension: 'DELEGATION' as const, track: 'SELF_REPORT' as const, prevalenceWeight: 0.6, sortOrder: 6 },
    ];

    for (const ind of indicators) {
      await app.prisma.behavioralIndicator.upsert({
        where: { shortCode: ind.shortCode },
        update: {},
        create: ind,
      });
    }

    // Create questions for each indicator
    const indicatorRecords = await app.prisma.behavioralIndicator.findMany();
    for (const ind of indicatorRecords) {
      const isScenario = ind.track === 'OBSERVABLE';
      await app.prisma.question.create({
        data: {
          dimension: ind.dimension,
          interactionMode: 'AUGMENTATION',
          questionType: isScenario ? 'SCENARIO' : 'SELF_REPORT',
          indicatorId: ind.id,
          text: `Test question for ${ind.shortCode}`,
          optionsJson: isScenario
            ? [
                { key: 'A', text: 'Best answer', isCorrect: true, score: 1.0 },
                { key: 'B', text: 'Good answer', isCorrect: false, score: 0.5 },
                { key: 'C', text: 'Poor answer', isCorrect: false, score: 0.25 },
                { key: 'D', text: 'Wrong answer', isCorrect: false, score: 0.0 },
              ]
            : { min: 1, max: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        },
      });
    }

    // Create assessment template
    const template = await app.prisma.assessmentTemplate.create({
      data: {
        orgId: org.id,
        name: 'Test Assessment Template',
        description: 'Test template',
        roleProfile: 'GENERIC',
        isCustom: false,
        dimensionWeights: { DELEGATION: 0.25, DESCRIPTION: 0.25, DISCERNMENT: 0.25, DILIGENCE: 0.25 },
        isActive: true,
      },
    });
    templateId = template.id;

    // Register a user via API
    const regResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `assess-${Date.now()}@test.example.com`,
        firstName: 'Assess',
        lastName: 'User',
        password: 'SecurePass123!@#',
        orgSlug,
      },
    });

    const regBody = regResponse.json();
    token = regBody.token;
    userId = regBody.user.id;
  });

  afterAll(async () => {
    // Cleanup in FK-safe order
    await app.prisma.fluencyProfile.deleteMany({ where: { orgId } });
    await app.prisma.response.deleteMany({ where: { orgId } });
    await app.prisma.assessmentSession.deleteMany({ where: { orgId } });
    await app.prisma.assessmentTemplate.deleteMany({ where: { orgId } });
    await app.prisma.question.deleteMany({});
    await app.prisma.behavioralIndicator.deleteMany({});
    await app.prisma.userSession.deleteMany({ where: { orgId } });
    await app.prisma.user.deleteMany({ where: { orgId } });
    await app.prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  // ─────────────────────────────────────────────────────────
  // POST /api/v1/assessments/start
  // ─────────────────────────────────────────────────────────

  describe('POST /api/v1/assessments/start', () => {
    test('starts a new assessment session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/start',
        headers: { authorization: `Bearer ${token}` },
        payload: { templateId },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.sessionId).toBeDefined();
      expect(body.status).toBe('IN_PROGRESS');
      expect(body.totalQuestions).toBeGreaterThan(0);
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/start',
        payload: { templateId },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 404 for non-existent template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/start',
        headers: { authorization: `Bearer ${token}` },
        payload: { templateId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Full assessment lifecycle
  // ─────────────────────────────────────────────────────────

  describe('Full assessment lifecycle', () => {
    let sessionId: string;

    test('start session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/start',
        headers: { authorization: `Bearer ${token}` },
        payload: { templateId },
      });

      expect(response.statusCode).toBe(201);
      sessionId = response.json().sessionId;
    });

    test('GET /assessments/:sessionId returns session status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessments/${sessionId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.session.id).toBe(sessionId);
      expect(body.session.status).toBe('IN_PROGRESS');
      expect(body.session.progressPct).toBe(0);
    });

    test('GET /assessments/:sessionId/questions returns all questions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessments/${sessionId}/questions`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.questions).toBeDefined();
      expect(Array.isArray(body.questions)).toBe(true);
      expect(body.questions.length).toBeGreaterThan(0);
      // Each question should have id, text, type, dimension, options
      const q = body.questions[0];
      expect(q.id).toBeDefined();
      expect(q.text).toBeDefined();
      expect(q.questionType).toBeDefined();
      expect(q.dimension).toBeDefined();
      expect(q.options).toBeDefined();
    });

    test('POST /assessments/:sessionId/responses submits answers', async () => {
      // Get questions first
      const qResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/assessments/${sessionId}/questions`,
        headers: { authorization: `Bearer ${token}` },
      });

      const questions = qResponse.json().questions;

      // Submit responses for all questions
      const responses = questions.map((q: { id: string; questionType: string }) => ({
        questionId: q.id,
        answer: q.questionType === 'SCENARIO' ? 'A' : '4',
      }));

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessments/${sessionId}/responses`,
        headers: { authorization: `Bearer ${token}` },
        payload: { responses },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.saved).toBe(responses.length);
      expect(body.progressPct).toBeGreaterThan(0);
    });

    test('POST /assessments/:sessionId/complete scores the assessment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessments/${sessionId}/complete`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profile).toBeDefined();
      expect(body.profile.overallScore).toBeDefined();
      expect(typeof body.profile.overallScore).toBe('number');
      expect(body.profile.dimensionScores).toBeDefined();
      expect(body.profile.dimensionScores.DELEGATION).toBeDefined();
      expect(body.profile.dimensionScores.DESCRIPTION).toBeDefined();
      expect(body.profile.dimensionScores.DISCERNMENT).toBeDefined();
      expect(body.profile.dimensionScores.DILIGENCE).toBeDefined();
    });

    test('GET /assessments/:sessionId/results returns scored profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessments/${sessionId}/results`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.profile).toBeDefined();
      expect(body.profile.overallScore).toBeDefined();
      expect(body.profile.indicatorBreakdown).toBeDefined();
    });

    test('GET /assessments/:sessionId shows COMPLETED status after completion', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assessments/${sessionId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.session.status).toBe('COMPLETED');
    });

    test('cannot complete an already completed session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessments/${sessionId}/complete`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    test('GET non-existent session returns 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/assessments/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
    });

    test('cannot submit responses to completed session', async () => {
      // Start and complete a session
      const startRes = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments/start',
        headers: { authorization: `Bearer ${token}` },
        payload: { templateId },
      });
      const sid = startRes.json().sessionId;

      // Get questions and submit all
      const qRes = await app.inject({
        method: 'GET',
        url: `/api/v1/assessments/${sid}/questions`,
        headers: { authorization: `Bearer ${token}` },
      });
      const questions = qRes.json().questions;
      const responses = questions.map((q: { id: string; questionType: string }) => ({
        questionId: q.id,
        answer: q.questionType === 'SCENARIO' ? 'B' : '3',
      }));

      await app.inject({
        method: 'POST',
        url: `/api/v1/assessments/${sid}/responses`,
        headers: { authorization: `Bearer ${token}` },
        payload: { responses },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/assessments/${sid}/complete`,
        headers: { authorization: `Bearer ${token}` },
      });

      // Try to submit more responses
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/assessments/${sid}/responses`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          responses: [{ questionId: questions[0].id, answer: 'C' }],
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });
});
