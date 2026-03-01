import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors';
import { parsePagination, paginatedResult } from '../utils/pagination';

// Schemas
const createQuestionSchema = z.object({
  domain: z.enum([
    'GOVERNANCE_STRATEGY',
    'RISK_MANAGEMENT',
    'COMPLIANCE_REGULATORY',
    'INFORMATION_SECURITY',
    'AUDIT_ASSURANCE',
    'BUSINESS_CONTINUITY',
  ]),
  type: z.enum(['MULTIPLE_CHOICE', 'SCENARIO_BASED', 'TRUE_FALSE']).default('MULTIPLE_CHOICE'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  text: z.string().min(10),
  options: z.any().optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  framework: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const updateQuestionSchema = createQuestionSchema.partial();

const questionRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /questions - List questions with filters
  fastify.get<{
    Querystring: {
      domain?: string;
      difficulty?: string;
      type?: string;
      page?: string;
      limit?: string;
    };
  }>('/questions', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const { domain, difficulty, type, page, limit } = request.query;
      const pagination = parsePagination({ page, limit });

      const where: any = { active: true };
      if (domain) where.domain = domain;
      if (difficulty) where.difficulty = difficulty;
      if (type) where.type = type;

      const [questions, total] = await Promise.all([
        fastify.prisma.question.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.question.count({ where }),
      ]);

      return reply.send(paginatedResult(questions, total, pagination)); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
    },
  });

  // POST /questions - Create question
  fastify.post('/questions', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const parsed = createQuestionSchema.safeParse(request.body);
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

      const question = await fastify.prisma.question.create({
        data: parsed.data,
      });

      return reply.code(201).send({ question });
    },
  });

  // PUT /questions/:id - Update question
  fastify.put<{ Params: { id: string } }>('/questions/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const { id } = request.params;
      const parsed = updateQuestionSchema.safeParse(request.body);
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

      const question = await fastify.prisma.question.update({
        where: { id },
        data: parsed.data,
      });

      return reply.send({ question });
    },
  });

  // DELETE /questions/:id - Soft delete
  fastify.delete<{ Params: { id: string } }>('/questions/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
    handler: async (request, reply) => {
      const { id } = request.params;

      const question = await fastify.prisma.question.update({
        where: { id },
        data: { active: false },
      });

      return reply.send({ question });
    },
  });
};

export default questionRoutes;
