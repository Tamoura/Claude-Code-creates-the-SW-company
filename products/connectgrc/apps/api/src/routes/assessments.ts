import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

// Schemas
const createAssessmentSchema = z.object({
  domain: z.enum([
    'GOVERNANCE_STRATEGY',
    'RISK_MANAGEMENT',
    'COMPLIANCE_REGULATORY',
    'INFORMATION_SECURITY',
    'AUDIT_ASSURANCE',
    'BUSINESS_CONTINUITY',
  ]),
});

const submitAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

const assessmentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /assessments - List user's assessments
  fastify.get('/assessments', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const assessments = await fastify.prisma.assessment.findMany({
        where: { userId: request.currentUser!.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { answers: true },
          },
        },
      });

      return reply.send({ assessments });
    },
  });

  // POST /assessments - Start new assessment
  fastify.post('/assessments', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const parsed = createAssessmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: parsed.error.issues,
          },
        });
      }
      const { domain } = parsed.data;

      // Get 10 random questions for the domain
      const questions = await fastify.prisma.question.findMany({
        where: {
          domain,
          active: true,
        },
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (questions.length < 10) {
        throw new BadRequestError('Not enough questions available for this domain');
      }

      // Create assessment
      const assessment = await fastify.prisma.assessment.create({
        data: {
          userId: request.currentUser!.id,
          domain,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Create placeholder answers
      await fastify.prisma.assessmentAnswer.createMany({
        data: questions.map((q) => ({
          assessmentId: assessment.id,
          questionId: q.id,
          answer: '',
        })),
      });

      return reply.code(201).send({ assessment, questions });
    },
  });

  // GET /assessments/:id - Get assessment with questions
  fastify.get<{ Params: { id: string } }>('/assessments/:id', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const assessment = await fastify.prisma.assessment.findUnique({
        where: { id },
        include: {
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }

      // Check ownership
      if (assessment.userId !== request.currentUser!.id) {
        throw new ForbiddenError('Not authorized to access this assessment');
      }

      return reply.send({ assessment });
    },
  });

  // POST /assessments/:id/answers - Submit answer
  fastify.post<{ Params: { id: string } }>('/assessments/:id/answers', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;
      const parsed = submitAnswerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: parsed.error.issues,
          },
        });
      }
      const { questionId, answer } = parsed.data;

      // Get assessment
      const assessment = await fastify.prisma.assessment.findUnique({
        where: { id },
      });

      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }

      if (assessment.userId !== request.currentUser!.id) {
        throw new ForbiddenError('Not authorized');
      }

      if (assessment.status !== 'IN_PROGRESS') {
        throw new BadRequestError('Assessment is not in progress');
      }

      // Get question
      const question = await fastify.prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      // Check if answer is correct
      const isCorrect = answer.trim().toLowerCase() === question.correctAnswer?.toLowerCase();

      // Update or create answer
      const assessmentAnswer = await fastify.prisma.assessmentAnswer.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: id,
            questionId,
          },
        },
        update: {
          answer,
          isCorrect,
          score: isCorrect ? 1 : 0,
        },
        create: {
          assessmentId: id,
          questionId,
          answer,
          isCorrect,
          score: isCorrect ? 1 : 0,
        },
      });

      return reply.send({ answer: assessmentAnswer });
    },
  });

  // POST /assessments/:id/complete - Complete assessment
  fastify.post<{ Params: { id: string } }>('/assessments/:id/complete', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const assessment = await fastify.prisma.assessment.findUnique({
        where: { id },
        include: {
          answers: true,
        },
      });

      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }

      if (assessment.userId !== request.currentUser!.id) {
        throw new ForbiddenError('Not authorized');
      }

      if (assessment.status !== 'IN_PROGRESS') {
        throw new BadRequestError('Assessment is not in progress');
      }

      // Calculate score
      const totalQuestions = assessment.answers.length;
      const correctAnswers = assessment.answers.filter((a) => a.isCorrect).length;
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // Determine tier
      let tier: 'FOUNDATION' | 'DEVELOPING' | 'PROFICIENT' | 'EXPERT';
      if (score >= 90) {
        tier = 'EXPERT';
      } else if (score >= 70) {
        tier = 'PROFICIENT';
      } else if (score >= 50) {
        tier = 'DEVELOPING';
      } else {
        tier = 'FOUNDATION';
      }

      // Update assessment
      const updatedAssessment = await fastify.prisma.assessment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          score,
          tier,
          completedAt: new Date(),
        },
      });

      // Update domain score in profile
      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: request.currentUser!.id },
      });

      if (profile) {
        await fastify.prisma.domainScore.upsert({
          where: {
            profileId_domain: {
              profileId: profile.id,
              domain: assessment.domain,
            },
          },
          update: {
            score,
            tier,
          },
          create: {
            profileId: profile.id,
            domain: assessment.domain,
            score,
            tier,
          },
        });
      }

      return reply.send({ assessment: updatedAssessment });
    },
  });
};

export default assessmentRoutes;
