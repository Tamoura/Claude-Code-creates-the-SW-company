/**
 * tests/integration/full-flow.test.ts — End-to-end assessment lifecycle
 *
 * Tests the COMPLETE flow through the API:
 *   register -> login -> start assessment -> answer questions -> complete -> get results -> profile
 *
 * Uses real database — no mocks.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Full Assessment Flow (E2E)', () => {
  let app: FastifyInstance;
  let orgId: string;
  let orgSlug: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create org
    const org = await app.prisma.organization.create({
      data: {
        name: 'E2E Test Org',
        slug: `e2e-test-org-${Date.now()}`,
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

    // Create indicators (one per dimension, minimum)
    const dims = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'] as const;
    for (let i = 0; i < dims.length; i++) {
      const ind = await app.prisma.behavioralIndicator.upsert({
        where: { shortCode: `E2E_${dims[i]}_01` },
        update: {},
        create: {
          shortCode: `E2E_${dims[i]}_01`,
          name: `E2E ${dims[i]}`,
          description: `E2E indicator for ${dims[i]}`,
          dimension: dims[i],
          track: 'OBSERVABLE',
          prevalenceWeight: 0.8,
          sortOrder: 200 + i,
        },
      });

      await app.prisma.question.create({
        data: {
          dimension: dims[i],
          interactionMode: 'AUGMENTATION',
          questionType: 'SCENARIO',
          indicatorId: ind.id,
          text: `E2E question for ${dims[i]}`,
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
        orgId,
        name: 'E2E Template',
        dimensionWeights: { DELEGATION: 0.25, DESCRIPTION: 0.25, DISCERNMENT: 0.25, DILIGENCE: 0.25 },
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await app.prisma.fluencyProfile.deleteMany({ where: { orgId } });
    await app.prisma.response.deleteMany({ where: { orgId } });
    await app.prisma.assessmentSession.deleteMany({ where: { orgId } });
    await app.prisma.assessmentTemplate.deleteMany({ where: { orgId } });
    const e2eInds = await app.prisma.behavioralIndicator.findMany({
      where: { shortCode: { startsWith: 'E2E_' } },
    });
    for (const ind of e2eInds) {
      await app.prisma.question.deleteMany({ where: { indicatorId: ind.id } });
    }
    await app.prisma.behavioralIndicator.deleteMany({
      where: { shortCode: { startsWith: 'E2E_' } },
    });
    await app.prisma.userSession.deleteMany({ where: { orgId } });
    await app.prisma.user.deleteMany({ where: { orgId } });
    await app.prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  test('complete lifecycle: register -> login -> assess -> profile', async () => {
    const email = `e2e-${Date.now()}@test.example.com`;
    const password = 'SecurePass123!@#';

    // ── 1. REGISTER ──────────────────────────────────────────────────────
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, firstName: 'E2E', lastName: 'Tester', password, orgSlug },
    });
    expect(regRes.statusCode).toBe(201);
    const regToken = regRes.json().token;

    // ── 2. LOGIN ─────────────────────────────────────────────────────────
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password, orgSlug },
    });
    expect(loginRes.statusCode).toBe(200);
    const token = loginRes.json().token;

    // ── 3. GET /me ───────────────────────────────────────────────────────
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.email).toBe(email);

    // ── 4. START ASSESSMENT ──────────────────────────────────────────────
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(startRes.statusCode).toBe(201);
    const startBody = startRes.json();
    const sessionId = startBody.session.id;
    expect(startBody.totalQuestions).toBeGreaterThan(0);
    expect(startBody.questions.length).toBeGreaterThan(0);

    // ── 5. GET QUESTIONS ─────────────────────────────────────────────────
    const qRes = await app.inject({
      method: 'GET',
      url: `/api/v1/assessments/${sessionId}/questions`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(qRes.statusCode).toBe(200);
    const questions = qRes.json().questions;
    expect(questions.length).toBeGreaterThan(0);

    // ── 6. SUBMIT ALL ANSWERS (best answers) ─────────────────────────────
    const responses = questions.map((q: { id: string }) => ({
      questionId: q.id,
      answer: 'A', // Best answer for all
    }));

    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${sessionId}/responses`,
      headers: { authorization: `Bearer ${token}` },
      payload: { responses },
    });
    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.json().saved).toBe(responses.length);
    expect(submitRes.json().progressPct).toBe(100);

    // ── 7. COMPLETE ASSESSMENT ───────────────────────────────────────────
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${sessionId}/complete`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(completeRes.statusCode).toBe(200);
    const profile = completeRes.json().profile;
    expect(profile.overallScore).toBeDefined();
    expect(profile.overallScore).toBeGreaterThan(0);
    expect(profile.dimensionScores.DELEGATION).toBeDefined();
    expect(profile.dimensionScores.DESCRIPTION).toBeDefined();
    expect(profile.dimensionScores.DISCERNMENT).toBeDefined();
    expect(profile.dimensionScores.DILIGENCE).toBeDefined();

    // ── 8. GET RESULTS ───────────────────────────────────────────────────
    const resultsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/assessments/${sessionId}/results`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resultsRes.statusCode).toBe(200);
    expect(resultsRes.json().profile.overallScore).toBe(profile.overallScore);

    // ── 9. CHECK SESSION IS COMPLETED ────────────────────────────────────
    const sessionRes = await app.inject({
      method: 'GET',
      url: `/api/v1/assessments/${sessionId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.json().session.status).toBe('COMPLETED');

    // ── 10. GET PROFILE ──────────────────────────────────────────────────
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.json().profile).not.toBeNull();
    expect(profileRes.json().profile.overallScore).toBe(profile.overallScore);

    // ── 11. GET PROFILE HISTORY ──────────────────────────────────────────
    const historyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/history',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(historyRes.statusCode).toBe(200);
    expect(historyRes.json().profiles.length).toBe(1);

    // ── 12. GET DASHBOARD ────────────────────────────────────────────────
    const dashRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashRes.statusCode).toBe(200);
    const dashBody = dashRes.json();
    expect(dashBody.user.email).toBe(email);
    expect(dashBody.assessmentCount).toBe(1);
    expect(dashBody.latestProfile).not.toBeNull();
    expect(dashBody.latestProfile.overallScore).toBe(profile.overallScore);
  });
});
