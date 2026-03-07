/**
 * routes/profile.ts — Fluency profile endpoints
 *
 * GET /         — Get current user's latest fluency profile
 * GET /history  — Get all fluency profiles for the user (assessment history)
 *
 * All endpoints require authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  // All profile routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // -- GET / (latest profile) -------------------------------------------------
  fastify.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.currentUser!;

      const profile = await fastify.prisma.fluencyProfile.findFirst({
        where: {
          userId: user.id,
          orgId: user.orgId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      });

      if (!profile) {
        return reply.code(200).send({ profile: null });
      }

      return reply.code(200).send({
        profile: {
          id: profile.id,
          overallScore: profile.overallScore,
          dimensionScores: profile.dimensionScores,
          selfReportScores: profile.selfReportScores,
          indicatorBreakdown: profile.indicatorBreakdown,
          discernmentGap: profile.discernmentGap,
          algorithmVersion: profile.algorithmVersion,
          sessionId: profile.sessionId,
          session: {
            id: profile.session.id,
            status: profile.session.status,
            startedAt: profile.session.startedAt.toISOString(),
            completedAt: profile.session.completedAt?.toISOString() ?? null,
          },
          createdAt: profile.createdAt.toISOString(),
        },
      });
    }
  );

  // -- GET /history -----------------------------------------------------------
  fastify.get(
    '/history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.currentUser!;

      const profiles = await fastify.prisma.fluencyProfile.findMany({
        where: {
          userId: user.id,
          orgId: user.orgId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
              template: {
                select: { name: true, roleProfile: true },
              },
            },
          },
        },
      });

      return reply.code(200).send({
        profiles: profiles.map((p) => ({
          id: p.id,
          overallScore: p.overallScore,
          dimensionScores: p.dimensionScores,
          selfReportScores: p.selfReportScores,
          discernmentGap: p.discernmentGap,
          algorithmVersion: p.algorithmVersion,
          sessionId: p.sessionId,
          session: {
            id: p.session.id,
            status: p.session.status,
            templateName: p.session.template.name,
            roleProfile: p.session.template.roleProfile,
            startedAt: p.session.startedAt.toISOString(),
            completedAt: p.session.completedAt?.toISOString() ?? null,
          },
          createdAt: p.createdAt.toISOString(),
        })),
        total: profiles.length,
      });
    }
  );
}
