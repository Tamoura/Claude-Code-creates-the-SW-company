/**
 * services/assessment.service.ts — Assessment session business logic
 *
 * Handles session creation, response saving, completion, and scoring.
 * Uses the scoring engine from scoring.ts for profile generation.
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { scoreAssessment, IndicatorInput, DimensionWeights } from './scoring.js';
import { AIFeedbackGenerator, FeedbackResult } from './ai-feedback.js';
import { OpenRouterClient } from './openrouter.js';
import { config } from '../config.js';

const SESSION_EXPIRY_HOURS = 24;

export class AssessmentService {
  private feedbackGenerator: AIFeedbackGenerator | null = null;

  constructor(private readonly prisma: PrismaClient) {
    if (config.OPENROUTER_API_KEY) {
      const client = new OpenRouterClient({
        apiKey: config.OPENROUTER_API_KEY,
        model: config.OPENROUTER_MODEL,
        baseUrl: config.OPENROUTER_BASE_URL,
        maxTokens: config.OPENROUTER_MAX_TOKENS,
        temperature: config.OPENROUTER_TEMPERATURE,
      });
      this.feedbackGenerator = new AIFeedbackGenerator(client);
    }
  }

  async createSession(
    userId: string,
    orgId: string,
    templateId: string
  ) {
    // Verify template exists and is active
    const template = await this.prisma.assessmentTemplate.findFirst({
      where: {
        id: templateId,
        isActive: true,
        OR: [{ orgId }, { orgId: null }],
      },
    });

    if (!template) {
      throw new AppError('template-not-found', 404, 'Assessment template not found');
    }

    // Get active algorithm version
    const algo = await this.prisma.algorithmVersion.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!algo) {
      throw new AppError('no-algorithm', 500, 'No active scoring algorithm found');
    }

    // Fetch questions for this assessment
    const questions = await this.prisma.question.findMany({
      where: { isActive: true },
      include: {
        indicator: {
          select: {
            shortCode: true,
            dimension: true,
            track: true,
            prevalenceWeight: true,
          },
        },
      },
      orderBy: [{ dimension: 'asc' }, { createdAt: 'asc' }],
    });

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    const session = await this.prisma.assessmentSession.create({
      data: {
        orgId,
        userId,
        templateId,
        algorithmVersionId: algo.version,
        status: 'IN_PROGRESS',
        progressPct: 0,
        expiresAt,
      },
    });

    return {
      sessionId: session.id,
      questions: questions.map((q) => ({
        id: q.id,
        dimension: q.dimension,
        interactionMode: q.interactionMode,
        questionType: q.questionType,
        text: q.text,
        optionsJson: q.optionsJson,
      })),
      totalQuestions: questions.length,
    };
  }

  async getSession(sessionId: string, userId: string, orgId?: string) {
    const session = await this.prisma.assessmentSession.findFirst({
      where: { id: sessionId, userId, ...(orgId ? { orgId } : {}), deletedAt: null },
      include: {
        responses: {
          select: { questionId: true, answer: true },
        },
      },
    });

    if (!session) {
      throw new AppError('session-not-found', 404, 'Assessment session not found');
    }

    // Fetch questions
    const questions = await this.prisma.question.findMany({
      where: { isActive: true },
      orderBy: [{ dimension: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        dimension: true,
        interactionMode: true,
        questionType: true,
        text: true,
        optionsJson: true,
      },
    });

    return {
      id: session.id,
      status: session.status,
      progressPct: session.progressPct,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      questions,
      responses: session.responses,
    };
  }

  async saveResponse(
    sessionId: string,
    userId: string,
    orgId: string,
    questionId: string,
    answer: string,
    elapsedSeconds?: number
  ) {
    // Verify session exists, is in progress, and not expired
    const session = await this.prisma.assessmentSession.findFirst({
      where: { id: sessionId, userId, status: 'IN_PROGRESS', deletedAt: null },
    });

    if (!session) {
      throw new AppError('session-not-found', 404, 'Session not found or not in progress');
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('session-expired', 410, 'Assessment session has expired');
    }

    // Upsert response (idempotent on sessionId + questionId)
    await this.prisma.response.upsert({
      where: {
        sessionId_questionId: { sessionId, questionId },
      },
      update: {
        answer,
        elapsedSeconds,
      },
      create: {
        orgId,
        sessionId,
        questionId,
        answer,
        elapsedSeconds,
      },
    });

    // Count total questions and responses to calculate progress
    const totalQuestions = await this.prisma.question.count({
      where: { isActive: true },
    });
    const answeredCount = await this.prisma.response.count({
      where: { sessionId },
    });

    const progressPct = totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100 * 10) / 10
      : 0;

    // Update session progress
    await this.prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { progressPct },
    });

    return { progressPct, answeredCount, totalQuestions };
  }

  async completeSession(sessionId: string, userId: string, orgId: string) {
    // Verify session
    const session = await this.prisma.assessmentSession.findFirst({
      where: { id: sessionId, userId, deletedAt: null },
      include: {
        template: true,
      },
    });

    if (!session) {
      throw new AppError('session-not-found', 404, 'Assessment session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new AppError(
        'session-not-in-progress',
        400,
        'Session is not in progress'
      );
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('session-expired', 410, 'Assessment session has expired');
    }

    // Get responses with question + indicator data
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      include: {
        question: {
          include: {
            indicator: true,
          },
        },
      },
    });

    // Build scoring inputs
    const indicatorInputs: IndicatorInput[] = responses.map((r) => ({
      shortCode: r.question.indicator.shortCode,
      dimension: r.question.indicator.dimension as IndicatorInput['dimension'],
      track: r.question.indicator.track as IndicatorInput['track'],
      prevalenceWeight: r.question.indicator.prevalenceWeight,
      answer: r.answer,
      questionType: r.question.questionType as IndicatorInput['questionType'],
    }));

    const weights = session.template.dimensionWeights as Record<string, number>;
    const dimensionWeights: DimensionWeights = {
      DELEGATION: weights.DELEGATION ?? 0.25,
      DESCRIPTION: weights.DESCRIPTION ?? 0.25,
      DISCERNMENT: weights.DISCERNMENT ?? 0.25,
      DILIGENCE: weights.DILIGENCE ?? 0.25,
    };

    // Build options map for scoring
    const optionsMap: Record<string, unknown> = {};
    for (const r of responses) {
      optionsMap[r.question.indicator.shortCode] = r.question.optionsJson;
    }

    // Run scoring engine
    const scored = scoreAssessment(indicatorInputs, dimensionWeights, optionsMap);

    // Mark session complete
    await this.prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progressPct: 100,
      },
    });

    // Create fluency profile
    const profile = await this.prisma.fluencyProfile.create({
      data: {
        orgId,
        userId,
        sessionId,
        algorithmVersion: session.algorithmVersionId,
        overallScore: scored.overallScore,
        dimensionScores: scored.dimensionScores as object,
        selfReportScores: scored.selfReportScores as object,
        indicatorBreakdown: scored.indicatorBreakdown as object,
        discernmentGap: scored.discernmentGap,
      },
    });

    // Generate AI feedback asynchronously (non-blocking)
    let aiFeedback: FeedbackResult | null = null;
    if (this.feedbackGenerator) {
      try {
        aiFeedback = await this.feedbackGenerator.generate({
          profile: scored,
        });
      } catch {
        // AI feedback is optional — scoring succeeds without it
      }
    }

    // Store AI feedback alongside the profile if available
    if (aiFeedback) {
      await this.prisma.fluencyProfile.update({
        where: { id: profile.id },
        data: { aiFeedback: aiFeedback as object },
      });
    }

    return {
      profileId: profile.id,
      overallScore: scored.overallScore,
      dimensionScores: scored.dimensionScores,
      selfReportScores: scored.selfReportScores,
      indicatorBreakdown: scored.indicatorBreakdown,
      discernmentGap: scored.discernmentGap,
      aiFeedback,
    };
  }

  async getResults(sessionId: string, userId: string, orgId?: string) {
    const profile = await this.prisma.fluencyProfile.findFirst({
      where: { sessionId, userId, ...(orgId ? { orgId } : {}) },
    });

    if (!profile) {
      throw new AppError('results-not-found', 404, 'Assessment results not found');
    }

    return {
      profileId: profile.id,
      overallScore: profile.overallScore,
      dimensionScores: profile.dimensionScores,
      selfReportScores: profile.selfReportScores,
      indicatorBreakdown: profile.indicatorBreakdown,
      discernmentGap: profile.discernmentGap,
      aiFeedback: (profile as { aiFeedback?: unknown }).aiFeedback ?? null,
      createdAt: profile.createdAt,
    };
  }
}
