import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// ==================== SCHEMAS ====================

const createRiskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  likelihood: z.number().int().min(1).max(5, 'Likelihood must be between 1 and 5'),
  impact: z.number().int().min(1).max(5, 'Impact must be between 1 and 5'),
  status: z.enum(['IDENTIFIED', 'ASSESSED', 'MITIGATING', 'ACCEPTED', 'CLOSED']).optional(),
  mitigationPlan: z.string().optional(),
});

const updateRiskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  status: z.enum(['IDENTIFIED', 'ASSESSED', 'MITIGATING', 'ACCEPTED', 'CLOSED']).optional(),
  mitigationPlan: z.string().optional(),
});

const listRisksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['title', 'created', 'updated', 'riskScore']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['IDENTIFIED', 'ASSESSED', 'MITIGATING', 'ACCEPTED', 'CLOSED']).optional(),
  category: z.string().optional(),
  minScore: z.coerce.number().int().min(1).max(25).optional(),
  maxScore: z.coerce.number().int().min(1).max(25).optional(),
  owner: z.string().optional(),
});

type CreateRiskBody = z.infer<typeof createRiskSchema>;
type UpdateRiskBody = z.infer<typeof updateRiskSchema>;
type ListRisksQuery = z.infer<typeof listRisksQuerySchema>;

// ==================== UTILITIES ====================

/**
 * Calculate risk score (likelihood × impact)
 */
function calculateRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

/**
 * Add riskScore to risk object
 */
function enrichRiskWithScore(risk: any) {
  return {
    ...risk,
    riskScore: calculateRiskScore(risk.likelihood, risk.impact),
  };
}

// ==================== ROUTES ====================

export async function riskRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/risks - List all risks with filtering, sorting, and pagination
  fastify.get<{ Querystring: ListRisksQuery }>(
    '/',
    {
      preHandler: [authenticate, authorize('read', 'Risk')],
    },
    async (request: FastifyRequest<{ Querystring: ListRisksQuery }>, reply: FastifyReply) => {
      // Parse and validate query parameters
      const queryResult = listRisksQuerySchema.safeParse(request.query);

      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: queryResult.error.errors[0].message,
        });
      }

      const { page, limit, sort, order, status, category, minScore, maxScore, owner } = queryResult.data;

      // Build where clause
      const where: any = {
        organizationId: request.user!.organizationId,
      };

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category = category;
      }

      if (owner) {
        where.ownerId = owner;
      }

      // For score filtering, we need to filter after fetching
      // since riskScore is computed
      const needsScoreFilter = minScore !== undefined || maxScore !== undefined;

      // Fetch all risks that match basic filters
      let risks = await prisma.risk.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Add riskScore to each risk
      risks = risks.map(enrichRiskWithScore);

      // Apply score filtering if needed
      if (needsScoreFilter) {
        risks = risks.filter((risk) => {
          const score = risk.riskScore;
          if (minScore !== undefined && score < minScore) return false;
          if (maxScore !== undefined && score > maxScore) return false;
          return true;
        });
      }

      // Apply sorting
      risks.sort((a, b) => {
        let comparison = 0;

        switch (sort) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'created':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updated':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'riskScore':
            comparison = a.riskScore - b.riskScore;
            break;
        }

        return order === 'asc' ? comparison : -comparison;
      });

      // Calculate pagination
      const total = risks.length;
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      const paginatedRisks = risks.slice(skip, skip + limit);

      return reply.status(200).send({
        risks: paginatedRisks,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    }
  );

  // GET /api/v1/risks/:id - Get single risk by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate, authorize('read', 'Risk')],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const risk = await prisma.risk.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          controls: {
            include: {
              control: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
          assets: {
            include: {
              asset: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!risk || risk.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Risk not found',
        });
      }

      // Enrich with riskScore
      const enrichedRisk = enrichRiskWithScore(risk);

      return reply.status(200).send({ risk: enrichedRisk });
    }
  );

  // POST /api/v1/risks - Create a new risk
  fastify.post<{ Body: CreateRiskBody }>(
    '/',
    {
      preHandler: [authenticate, authorize('create', 'Risk')],
    },
    async (request: FastifyRequest<{ Body: CreateRiskBody }>, reply: FastifyReply) => {
      const validationResult = createRiskSchema.safeParse(request.body);

      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: validationResult.error.errors[0].message,
        });
      }

      const { title, description, category, likelihood, impact, status, mitigationPlan } = validationResult.data;

      const risk = await prisma.risk.create({
        data: {
          title,
          description,
          category,
          likelihood,
          impact,
          status: status || 'IDENTIFIED',
          mitigationPlan,
          organizationId: request.user!.organizationId,
          ownerId: request.user!.id,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Enrich with riskScore
      const enrichedRisk = enrichRiskWithScore(risk);

      return reply.status(201).send({ risk: enrichedRisk });
    }
  );

  // PUT /api/v1/risks/:id - Update a risk
  fastify.put<{ Params: { id: string }; Body: UpdateRiskBody }>(
    '/:id',
    {
      preHandler: [authenticate, authorize('update', 'Risk')],
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateRiskBody }>, reply: FastifyReply) => {
      const { id } = request.params;

      const validationResult = updateRiskSchema.safeParse(request.body);

      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: validationResult.error.errors[0].message,
        });
      }

      const risk = await prisma.risk.findUnique({
        where: { id },
      });

      if (!risk || risk.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Risk not found',
        });
      }

      const updatedRisk = await prisma.risk.update({
        where: { id },
        data: validationResult.data,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Enrich with riskScore
      const enrichedRisk = enrichRiskWithScore(updatedRisk);

      return reply.status(200).send({ risk: enrichedRisk });
    }
  );

  // DELETE /api/v1/risks/:id - Delete a risk
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate, authorize('delete', 'Risk')],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const risk = await prisma.risk.findUnique({
        where: { id },
      });

      if (!risk || risk.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Risk not found',
        });
      }

      await prisma.risk.delete({
        where: { id },
      });

      return reply.status(200).send({
        message: 'Risk deleted successfully',
      });
    }
  );

  // POST /api/v1/risks/:id/controls - Link a control to a risk
  fastify.post<{ Params: { id: string }; Body: { controlId: string } }>(
    '/:id/controls',
    {
      preHandler: [authenticate, authorize('update', 'Risk')],
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { controlId: string } }>, reply: FastifyReply) => {
      const { id: riskId } = request.params;
      const { controlId } = request.body;

      // Validate controlId
      if (!controlId) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'controlId is required',
        });
      }

      // Verify risk exists and belongs to organization
      const risk = await prisma.risk.findUnique({
        where: { id: riskId },
      });

      if (!risk || risk.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Risk not found',
        });
      }

      // Verify control exists and belongs to organization
      const control = await prisma.control.findUnique({
        where: { id: controlId },
      });

      if (!control || control.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Control not found',
        });
      }

      // Check if link already exists
      const existingLink = await prisma.riskControl.findUnique({
        where: {
          riskId_controlId: {
            riskId,
            controlId,
          },
        },
      });

      if (existingLink) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Control is already linked to this risk',
        });
      }

      // Create the link
      await prisma.riskControl.create({
        data: {
          riskId,
          controlId,
        },
      });

      return reply.status(201).send({
        message: 'Control linked to risk successfully',
      });
    }
  );

  // DELETE /api/v1/risks/:id/controls/:controlId - Unlink a control from a risk
  fastify.delete<{ Params: { id: string; controlId: string } }>(
    '/:id/controls/:controlId',
    {
      preHandler: [authenticate, authorize('update', 'Risk')],
    },
    async (request: FastifyRequest<{ Params: { id: string; controlId: string } }>, reply: FastifyReply) => {
      const { id: riskId, controlId } = request.params;

      // Verify risk exists and belongs to organization
      const risk = await prisma.risk.findUnique({
        where: { id: riskId },
      });

      if (!risk || risk.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Risk not found',
        });
      }

      // Check if link exists
      const link = await prisma.riskControl.findUnique({
        where: {
          riskId_controlId: {
            riskId,
            controlId,
          },
        },
      });

      if (!link) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Link not found',
        });
      }

      // Delete the link
      await prisma.riskControl.delete({
        where: {
          riskId_controlId: {
            riskId,
            controlId,
          },
        },
      });

      return reply.status(200).send({
        message: 'Control unlinked from risk successfully',
      });
    }
  );
}
