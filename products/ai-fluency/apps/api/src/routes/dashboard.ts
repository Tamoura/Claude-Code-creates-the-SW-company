/**
 * routes/dashboard.ts — Dashboard data endpoint
 *
 * GET / — Get aggregated dashboard data for the authenticated user
 *
 * Returns:
 * - User info (name, email, role)
 * - Latest fluency profile scores (or null if no assessment)
 * - Assessment count (completed)
 * - Learning path progress (or null if no path)
 *
 * Requires authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', fastify.authenticate);

  // -- GET / ------------------------------------------------------------------
  fastify.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.currentUser!;

      // Fetch user details
      const dbUser = await fastify.prisma.user.findFirst({
        where: {
          id: user.id,
          orgId: user.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      // Count completed assessments
      const assessmentCount = await fastify.prisma.assessmentSession.count({
        where: {
          userId: user.id,
          orgId: user.orgId,
          status: 'COMPLETED',
          deletedAt: null,
        },
      });

      // Get latest fluency profile
      const latestProfile = await fastify.prisma.fluencyProfile.findFirst({
        where: {
          userId: user.id,
          orgId: user.orgId,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get active learning path progress
      const learningPath = await fastify.prisma.learningPath.findFirst({
        where: {
          userId: user.id,
          orgId: user.orgId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { modules: true } },
        },
      });

      // Count completed learning path modules
      let completedModules = 0;
      if (learningPath) {
        completedModules = await fastify.prisma.learningPathModule.count({
          where: {
            pathId: learningPath.id,
            status: 'COMPLETED',
          },
        });
      }

      return reply.code(200).send({
        user: dbUser
          ? {
              id: dbUser.id,
              email: dbUser.email,
              firstName: dbUser.firstName,
              lastName: dbUser.lastName,
              role: dbUser.role,
            }
          : null,
        latestProfile: latestProfile
          ? {
              id: latestProfile.id,
              overallScore: latestProfile.overallScore,
              dimensionScores: latestProfile.dimensionScores,
              selfReportScores: latestProfile.selfReportScores,
              discernmentGap: latestProfile.discernmentGap,
              createdAt: latestProfile.createdAt.toISOString(),
            }
          : null,
        assessmentCount,
        learningPath: learningPath
          ? {
              id: learningPath.id,
              status: learningPath.status,
              progressPct: learningPath.progressPct,
              estimatedHours: learningPath.estimatedHours,
              totalModules: learningPath._count.modules,
              completedModules,
            }
          : null,
      });
    }
  );
}
