import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const createRiskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
});

type CreateRiskBody = z.infer<typeof createRiskSchema>;

export async function riskRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/risks - List all risks
  fastify.get(
    '/',
    {
      preHandler: [authenticate, authorize('read', 'Risk')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const risks = await prisma.risk.findMany({
        where: { organizationId: request.user!.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.status(200).send({ risks });
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

      const { title, description, category, likelihood, impact } = validationResult.data;

      const risk = await prisma.risk.create({
        data: {
          title,
          description,
          category,
          likelihood,
          impact,
          organizationId: request.user!.organizationId,
          ownerId: request.user!.id,
        },
      });

      return reply.status(201).send({ risk });
    }
  );

  // PUT /api/v1/risks/:id - Update a risk
  fastify.put<{ Params: { id: string }; Body: Partial<CreateRiskBody> }>(
    '/:id',
    {
      preHandler: [authenticate, authorize('update', 'Risk')],
    },
    async (request, reply) => {
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

      const updatedRisk = await prisma.risk.update({
        where: { id },
        data: request.body,
      });

      return reply.status(200).send({ risk: updatedRisk });
    }
  );

  // DELETE /api/v1/risks/:id - Delete a risk
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate, authorize('delete', 'Risk')],
    },
    async (request, reply) => {
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
}
