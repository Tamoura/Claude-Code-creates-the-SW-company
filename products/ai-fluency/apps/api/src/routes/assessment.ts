/**
 * routes/assessment.ts — Assessment lifecycle endpoints
 *
 * POST   /start                — create new session (auto-selects template)
 * GET    /:sessionId           — get session status + progress
 * GET    /:sessionId/questions — get all questions for this session
 * POST   /:sessionId/respond   — submit single answer, update progress
 * POST   /:sessionId/responses — submit batch answers, update progress
 * POST   /:sessionId/complete  — finalize, run scoring, create FluencyProfile
 * GET    /:sessionId/results   — get scored results
 *
 * All endpoints require authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors.js';
import {
  scoreAssessment,
  IndicatorInput,
  DimensionWeights,
} from '../services/scoring.js';

// -- Types for Prisma select results ------------------------------------------

interface QuestionSelect {
  id: string;
  text: string;
  questionType: string;
  dimension: string;
  interactionMode: string;
  optionsJson: unknown;
}

function formatQuestion(q: QuestionSelect) {
  return {
    id: q.id,
    text: q.text,
    questionType: q.questionType,
    dimension: q.dimension,
    interactionMode: q.interactionMode,
    options: q.optionsJson,
  };
}

// -- Validation Schemas -------------------------------------------------------

const respondSchema = z.object({
  questionId: z.string().uuid('questionId must be a valid UUID'),
  answer: z.string().min(1, 'answer is required').max(10),
});

const responsesSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().uuid('questionId must be a valid UUID'),
        answer: z.string().min(1, 'answer is required').max(10),
      })
    )
    .min(1, 'At least one response is required'),
});

const uuidParamSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
});

// -- Constants ----------------------------------------------------------------

const SESSION_EXPIRY_HOURS = 2;

// -- Helpers ------------------------------------------------------------------

function parseSessionParam(params: unknown): string {
  const parsed = uuidParamSchema.safeParse(params);
  if (!parsed.success) {
    throw new AppError('validation-error', 400, 'Invalid session ID');
  }
  return parsed.data.sessionId;
}

async function getVerifiedSession(
  fastify: FastifyInstance,
  sessionId: string,
  userId: string,
  orgId: string,
  options?: {
    requireInProgress?: boolean;
    includeTemplate?: boolean;
  }
) {
  const session = await fastify.prisma.assessmentSession.findFirst({
    where: {
      id: sessionId,
      userId,
      orgId,
      deletedAt: null,
    },
    include: options?.includeTemplate ? { template: true } : undefined,
  });

  if (!session) {
    throw new AppError('session-not-found', 404, 'Assessment session not found');
  }

  if (options?.requireInProgress && session.status !== 'IN_PROGRESS') {
    throw new AppError(
      'session-not-active',
      409,
      'Assessment session is not in progress'
    );
  }

  return session;
}

async function checkSessionExpiry(
  fastify: FastifyInstance,
  session: { id: string; expiresAt: Date }
) {
  if (session.expiresAt < new Date()) {
    await fastify.prisma.assessmentSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('session-expired', 410, 'Assessment session has expired');
  }
}

async function upsertResponses(
  fastify: FastifyInstance,
  sessionId: string,
  orgId: string,
  items: Array<{ questionId: string; answer: string }>
) {
  for (const resp of items) {
    await fastify.prisma.response.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: resp.questionId,
        },
      },
      update: { answer: resp.answer },
      create: {
        orgId,
        sessionId,
        questionId: resp.questionId,
        answer: resp.answer,
      },
    });
  }
}

async function updateProgress(
  fastify: FastifyInstance,
  sessionId: string
): Promise<{ progressPct: number; answeredCount: number; totalQuestions: number }> {
  const totalQuestions = await fastify.prisma.question.count({
    where: { isActive: true },
  });
  const answeredCount = await fastify.prisma.response.count({
    where: { sessionId },
  });
  const progressPct =
    totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100 * 10) / 10
      : 0;

  await fastify.prisma.assessmentSession.update({
    where: { id: sessionId },
    data: { progressPct },
  });

  return { progressPct, answeredCount, totalQuestions };
}

// -- Route Registration -------------------------------------------------------

export async function assessmentRoutes(fastify: FastifyInstance): Promise<void> {
  // All assessment routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // -- POST /start ------------------------------------------------------------
  fastify.post(
    '/start',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.currentUser!;

      // Get active algorithm version
      const algorithm = await fastify.prisma.algorithmVersion.findFirst({
        where: { isActive: true },
        orderBy: { version: 'desc' },
      });

      if (!algorithm) {
        throw new AppError('no-algorithm', 500, 'No active scoring algorithm configured');
      }

      // Auto-select template: prefer org-specific, fall back to platform-provided
      const template = await fastify.prisma.assessmentTemplate.findFirst({
        where: {
          isActive: true,
          OR: [{ orgId: user.orgId }, { orgId: null }],
        },
        orderBy: [{ orgId: 'desc' }, { createdAt: 'desc' }],
      });

      if (!template) {
        throw new AppError('no-template', 500, 'No assessment template found');
      }

      // Check for existing in-progress session — resume it instead of creating new
      const existing = await fastify.prisma.assessmentSession.findFirst({
        where: {
          userId: user.id,
          orgId: user.orgId,
          status: 'IN_PROGRESS',
          deletedAt: null,
        },
      });

      if (existing) {
        const questions = await fastify.prisma.question.findMany({
          where: { isActive: true },
          orderBy: [{ dimension: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            text: true,
            questionType: true,
            dimension: true,
            interactionMode: true,
            optionsJson: true,
          },
        });

        return reply.code(200).send({
          session: {
            id: existing.id,
            status: existing.status,
            progressPct: existing.progressPct,
            startedAt: existing.startedAt.toISOString(),
            expiresAt: existing.expiresAt.toISOString(),
          },
          questions: questions.map(formatQuestion),
          totalQuestions: questions.length,
        });
      }

      // Create session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

      const session = await fastify.prisma.assessmentSession.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          templateId: template.id,
          algorithmVersionId: algorithm.version,
          status: 'IN_PROGRESS',
          progressPct: 0,
          expiresAt,
        },
      });

      // Fetch all active questions
      const questions = await fastify.prisma.question.findMany({
        where: { isActive: true },
        orderBy: [{ dimension: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          text: true,
          questionType: true,
          dimension: true,
          interactionMode: true,
          optionsJson: true,
        },
      });

      return reply.code(201).send({
        session: {
          id: session.id,
          status: session.status,
          progressPct: session.progressPct,
          startedAt: session.startedAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
        },
        questions: questions.map(formatQuestion),
        totalQuestions: questions.length,
      });
    }
  );

  // -- GET /:sessionId --------------------------------------------------------
  fastify.get(
    '/:sessionId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = parseSessionParam(request.params);
      const user = request.currentUser!;

      const session = await fastify.prisma.assessmentSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          orgId: user.orgId,
          deletedAt: null,
        },
        include: {
          template: { select: { name: true, roleProfile: true } },
          _count: { select: { responses: true } },
        },
      });

      if (!session) {
        throw new AppError('session-not-found', 404, 'Assessment session not found');
      }

      const totalQuestions = await fastify.prisma.question.count({
        where: { isActive: true },
      });

      return reply.code(200).send({
        session: {
          id: session.id,
          status: session.status,
          progressPct: session.progressPct,
          templateName: session.template.name,
          roleProfile: session.template.roleProfile,
          responsesSubmitted: session._count.responses,
          totalQuestions,
          startedAt: session.startedAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
        },
      });
    }
  );

  // -- GET /:sessionId/questions -----------------------------------------------
  fastify.get(
    '/:sessionId/questions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = parseSessionParam(request.params);
      const user = request.currentUser!;

      await getVerifiedSession(fastify, sessionId, user.id, user.orgId);

      const questions = await fastify.prisma.question.findMany({
        where: { isActive: true },
        orderBy: [{ dimension: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          text: true,
          questionType: true,
          dimension: true,
          interactionMode: true,
          optionsJson: true,
        },
      });

      const existingResponses = await fastify.prisma.response.findMany({
        where: { sessionId },
        select: { questionId: true, answer: true },
      });

      const responseMap = new Map(
        existingResponses.map((r) => [r.questionId, r.answer])
      );

      return reply.code(200).send({
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text,
          questionType: q.questionType,
          dimension: q.dimension,
          interactionMode: q.interactionMode,
          options: q.optionsJson,
          existingAnswer: responseMap.get(q.id) ?? null,
        })),
        totalQuestions: questions.length,
      });
    }
  );

  // -- POST /:sessionId/respond (single response) ----------------------------
  fastify.post(
    '/:sessionId/respond',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = parseSessionParam(request.params);
      const user = request.currentUser!;

      const parsed = respondSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const { questionId, answer } = parsed.data;

      const session = await getVerifiedSession(
        fastify, sessionId, user.id, user.orgId, { requireInProgress: true }
      );
      await checkSessionExpiry(fastify, session);

      // Verify question exists
      const question = await fastify.prisma.question.findFirst({
        where: { id: questionId, isActive: true },
      });
      if (!question) {
        throw new AppError('question-not-found', 404, 'Question not found');
      }

      await upsertResponses(fastify, sessionId, user.orgId, [{ questionId, answer }]);
      const progress = await updateProgress(fastify, sessionId);

      return reply.code(200).send({
        sessionId,
        questionId,
        ...progress,
      });
    }
  );

  // -- POST /:sessionId/responses (batch) ------------------------------------
  fastify.post(
    '/:sessionId/responses',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = parseSessionParam(request.params);
      const user = request.currentUser!;

      const bodyParsed = responsesSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        throw new AppError(
          'validation-error',
          400,
          bodyParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const { responses } = bodyParsed.data;

      const session = await getVerifiedSession(
        fastify, sessionId, user.id, user.orgId, { requireInProgress: true }
      );
      await checkSessionExpiry(fastify, session);

      await upsertResponses(fastify, sessionId, user.orgId, responses);
      const progress = await updateProgress(fastify, sessionId);

      return reply.code(200).send({
        saved: responses.length,
        ...progress,
      });
    }
  );

  // -- POST /:sessionId/complete ----------------------------------------------
  fastify.post(
    '/:sessionId/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = parseSessionParam(request.params);
      const user = request.currentUser!;

      const session = await getVerifiedSession(
        fastify, sessionId, user.id, user.orgId,
        { requireInProgress: true, includeTemplate: true }
      );

      // Get all responses with their questions and indicators
      const responses = await fastify.prisma.response.findMany({
        where: { sessionId },
        include: {
          question: { include: { indicator: true } },
        },
      });

      // Validate all questions answered
      const totalQuestions = await fastify.prisma.question.count({
        where: { isActive: true },
      });

      if (responses.length < totalQuestions) {
        const unanswered = totalQuestions - responses.length;
        throw new AppError(
          'incomplete-assessment',
          400,
          `${unanswered} question(s) remain unanswered. Please answer all questions before completing.`
        );
      }

      // Build scoring inputs
      const indicatorInputs: IndicatorInput[] = responses.map((r) => ({
        shortCode: r.question.indicator.shortCode,
        dimension: r.question.indicator.dimension as IndicatorInput['dimension'],
        track: r.question.indicator.track as IndicatorInput['track'],
        prevalenceWeight: r.question.indicator.prevalenceWeight,
        answer: r.answer,
        questionType: r.question.questionType as IndicatorInput['questionType'],
      }));

      // Build options map for scoring
      const optionsMap: Record<string, unknown> = {};
      for (const r of responses) {
        optionsMap[r.question.indicator.shortCode] = r.question.optionsJson;
      }

      // Get dimension weights from template (session includes template)
      const templateData = (session as typeof session & { template: { dimensionWeights: unknown } }).template;
      const weights = templateData.dimensionWeights as Record<string, number>;
      const dimensionWeights: DimensionWeights = {
        DELEGATION: weights.DELEGATION ?? weights.delegation ?? 0.25,
        DESCRIPTION: weights.DESCRIPTION ?? weights.description ?? 0.25,
        DISCERNMENT: weights.DISCERNMENT ?? weights.discernment ?? 0.25,
        DILIGENCE: weights.DILIGENCE ?? weights.diligence ?? 0.25,
      };

      // Score the assessment
      const scoredProfile = scoreAssessment(
        indicatorInputs,
        dimensionWeights,
        optionsMap
      );

      // Create FluencyProfile
      const profile = await fastify.prisma.fluencyProfile.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          sessionId,
          algorithmVersion: session.algorithmVersionId,
          overallScore: scoredProfile.overallScore,
          dimensionScores: scoredProfile.dimensionScores,
          selfReportScores: scoredProfile.selfReportScores,
          indicatorBreakdown: scoredProfile.indicatorBreakdown as object,
          discernmentGap: scoredProfile.discernmentGap,
        },
      });

      // Update session status
      await fastify.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          progressPct: 100,
        },
      });

      return reply.code(200).send({
        session: {
          id: sessionId,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
        profile: {
          id: profile.id,
          overallScore: profile.overallScore,
          dimensionScores: profile.dimensionScores,
          selfReportScores: profile.selfReportScores,
          indicatorBreakdown: profile.indicatorBreakdown,
          discernmentGap: profile.discernmentGap,
          createdAt: profile.createdAt.toISOString(),
        },
      });
    }
  );

  // -- GET /:sessionId/results ------------------------------------------------
  fastify.get(
    '/:sessionId/results',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = parseSessionParam(request.params);
      const user = request.currentUser!;

      const session = await getVerifiedSession(
        fastify, sessionId, user.id, user.orgId
      );

      if (session.status !== 'COMPLETED') {
        throw new AppError(
          'results-not-ready',
          400,
          'Assessment session has not been completed yet'
        );
      }

      const profile = await fastify.prisma.fluencyProfile.findUnique({
        where: { sessionId },
      });

      if (!profile) {
        throw new AppError(
          'results-not-ready',
          404,
          'Assessment results not yet available. Complete the assessment first.'
        );
      }

      return reply.code(200).send({
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
        },
        profile: {
          id: profile.id,
          overallScore: profile.overallScore,
          dimensionScores: profile.dimensionScores,
          selfReportScores: profile.selfReportScores,
          indicatorBreakdown: profile.indicatorBreakdown,
          discernmentGap: profile.discernmentGap,
          algorithmVersion: profile.algorithmVersion,
          createdAt: profile.createdAt.toISOString(),
        },
      });
    }
  );
}
