import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index';
import { verifyToken, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../lib/audit';
import { validate } from '../../lib/validate';

const updateProfileSchema = z.object({
  classification: z.enum(['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL', 'QFC', 'FOREIGN']).optional(),
  nin: z.string().optional(),
  isQatariNational: z.boolean().optional(),
  shariaPreference: z.boolean().optional(),
  riskTolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export default async function investorRoutes(fastify: FastifyInstance) {

  // GET /profile
  fastify.get('/profile', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser!;

    const profile = await fastify.prisma.investorProfile.findUnique({
      where: { userId: user.id },
      include: { user: { select: { email: true, fullNameEn: true, fullNameAr: true, phone: true } } },
    });

    if (!profile) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', 'Investor profile not found');
    }

    return reply.send({ data: profile });
  });

  // PUT /profile
  fastify.put('/profile', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(updateProfileSchema, request.body);
    const user = request.currentUser!;

    const existing = await fastify.prisma.investorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', 'Investor profile not found');
    }

    const before = { ...existing };
    const updated = await fastify.prisma.investorProfile.update({
      where: { userId: user.id },
      data: body as any,
    });

    await createAuditLog(fastify.prisma, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      action: 'UPDATE',
      resource: 'InvestorProfile',
      resourceId: existing.id,
      before,
      after: updated,
    });

    return reply.send({ data: updated });
  });

  // GET /portfolio
  fastify.get('/portfolio', {
    preHandler: [verifyToken, requireRole('INVESTOR')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser!;

    const investorProfile = await fastify.prisma.investorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!investorProfile) {
      return reply.send({ data: { items: [], totalValue: 0, currency: 'QAR' } });
    }

    const items = await fastify.prisma.portfolioItem.findMany({
      where: { investorId: investorProfile.id },
      include: {
        subscription: {
          include: { deal: { select: { titleEn: true, dealType: true } } },
        },
      },
    });

    const totalValue = items.reduce((sum, item) => {
      return sum + Number(item.currentValue || item.costBasis);
    }, 0);

    return reply.send({
      data: { items, totalValue, currency: 'QAR' },
    });
  });
}
