/**
 * tests/integration/learning-paths.test.ts — Learning path routes
 *
 * TDD RED phase: Tests written FIRST.
 *
 * Covers:
 * - POST  /api/v1/learning-paths
 * - GET   /api/v1/learning-paths/:id
 * - PATCH /api/v1/learning-paths/:id/modules/:moduleId
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { createTestOrg, cleanupTestOrg, TestContext } from '../helpers/test-org';

describe('[LEARNING-PATHS] Learning Path Routes', () => {
  let app: FastifyInstance;
  let ctx: TestContext;
  let prisma: PrismaClient;
  let profileId: string;
  let learningModuleIds: string[];

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
        name: 'LP Test Template',
        dimensionWeights: {
          DELEGATION: 0.25,
          DESCRIPTION: 0.25,
          DISCERNMENT: 0.25,
          DILIGENCE: 0.25,
        },
        isActive: true,
      },
    });

    // Seed indicators and questions
    const dimensions = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'] as const;
    const questionIds: string[] = [];

    for (const dim of dimensions) {
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
            text: `LP test question for ${dim}?`,
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

    // Seed learning modules (one per dimension)
    learningModuleIds = [];
    for (const dim of dimensions) {
      const mod = await prisma.learningModule.create({
        data: {
          title: `${dim} Module`,
          description: `Learning module for ${dim}`,
          dimension: dim,
          contentType: 'ARTICLE',
          estimatedMinutes: 30,
          difficulty: 'BEGINNER',
          contentUrl: `https://example.com/${dim.toLowerCase()}`,
          isActive: true,
        },
      });
      learningModuleIds.push(mod.id);
    }

    // Create a completed assessment session and profile directly in DB
    // (bypassing the API which requires answering ALL active questions)
    const session = await prisma.assessmentSession.create({
      data: {
        orgId: ctx.org.id,
        userId: ctx.user.id,
        templateId: template.id,
        algorithmVersionId: 1,
        status: 'COMPLETED',
        progressPct: 100,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const profile = await prisma.fluencyProfile.create({
      data: {
        orgId: ctx.org.id,
        userId: ctx.user.id,
        sessionId: session.id,
        algorithmVersion: 1,
        overallScore: 75.0,
        dimensionScores: { DELEGATION: 80, DESCRIPTION: 70, DISCERNMENT: 75, DILIGENCE: 75 },
        selfReportScores: { DELEGATION: 60, DESCRIPTION: 65, DISCERNMENT: 70, DILIGENCE: 60 },
        indicatorBreakdown: {},
        discernmentGap: false,
      },
    });
    profileId = profile.id;
  });

  afterAll(async () => {
    await prisma.moduleCompletion.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.learningPathModule.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.learningPath.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.fluencyProfile.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.response.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.assessmentSession.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.assessmentTemplate.deleteMany({ where: { orgId: ctx.org.id } });
    await prisma.learningModule.deleteMany({
      where: { id: { in: learningModuleIds } },
    });
    await cleanupTestOrg(ctx.org.id, prisma);
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/learning-paths
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/learning-paths', () => {
    test('creates learning path from profile with modules', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learning-paths',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { profileId },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('modules');
      expect(Array.isArray(body.modules)).toBe(true);
      expect(body.modules.length).toBeGreaterThan(0);
      expect(body).toHaveProperty('estimatedHours');
      expect(body).toHaveProperty('status', 'ACTIVE');
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learning-paths',
        payload: { profileId },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 400 for missing profileId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learning-paths',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 404 for non-existent profile', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/learning-paths',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { profileId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/learning-paths/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/learning-paths/:id', () => {
    let pathId: string;

    beforeAll(async () => {
      // Create a learning path first
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/learning-paths',
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { profileId },
      });
      // If path already exists from previous test, it may fail.
      // Let's use the existing one if so.
      if (res.statusCode === 201) {
        pathId = res.json().id;
      } else {
        // Path already exists, get it
        const existing = await prisma.learningPath.findFirst({
          where: { profileId, userId: ctx.user.id },
        });
        pathId = existing!.id;
      }
    });

    test('returns learning path with modules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/learning-paths/${pathId}`,
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('id', pathId);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('progressPct');
      expect(body).toHaveProperty('modules');
      expect(Array.isArray(body.modules)).toBe(true);
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/learning-paths/${pathId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 404 for non-existent path', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/learning-paths/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${ctx.token}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/learning-paths/:id/modules/:moduleId
  // ─────────────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/learning-paths/:id/modules/:moduleId', () => {
    let pathId: string;
    let pathModuleId: string;

    beforeAll(async () => {
      const existing = await prisma.learningPath.findFirst({
        where: { profileId, userId: ctx.user.id },
        include: { modules: true },
      });
      pathId = existing!.id;
      pathModuleId = existing!.modules[0].id;
    });

    test('updates module status to COMPLETED', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/learning-paths/${pathId}/modules/${pathModuleId}`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { status: 'COMPLETED' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('status', 'COMPLETED');
    });

    test('updates module status to IN_PROGRESS', async () => {
      // Create a second path module to test IN_PROGRESS
      const existing = await prisma.learningPath.findFirst({
        where: { profileId, userId: ctx.user.id },
        include: { modules: true },
      });
      const secondModule = existing!.modules.find((m) => m.id !== pathModuleId);
      if (!secondModule) return; // Skip if only one module

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/learning-paths/${pathId}/modules/${secondModule.id}`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { status: 'IN_PROGRESS' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('status', 'IN_PROGRESS');
    });

    test('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/learning-paths/${pathId}/modules/${pathModuleId}`,
        payload: { status: 'COMPLETED' },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 400 for invalid status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/learning-paths/${pathId}/modules/${pathModuleId}`,
        headers: { authorization: `Bearer ${ctx.token}` },
        payload: { status: 'INVALID_STATUS' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
