import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../lib/prisma.js';

export async function assessmentRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/assessments/:id/approve - Approve an assessment (Manager/Admin only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/approve',
    {
      preHandler: [authenticate, authorize('approve', 'Assessment')],
    },
    async (request, reply) => {
      const { id } = request.params;

      const assessment = await prisma.assessment.findUnique({
        where: { id },
      });

      if (!assessment || assessment.organizationId !== request.user!.organizationId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Assessment not found',
        });
      }

      const updatedAssessment = await prisma.assessment.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: request.user!.id,
          approvalDate: new Date(),
        },
      });

      return reply.status(200).send({ assessment: updatedAssessment });
    }
  );
}
