/**
 * routes/profiles.ts — Fluency profile routes
 *
 * GET /me      — Current user's latest fluency profile
 * GET /history — All assessment history for current user
 *
 * All routes require authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors.js';

export async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /me — Latest fluency profile
  fastify.get(
    '/me',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.currentUser!;

      const profile = await fastify.prisma.fluencyProfile.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!profile) {
        throw new AppError('profile-not-found', 404, 'No fluency profile found');
      }

      return reply.code(200).send({
        profileId: profile.id,
        overallScore: profile.overallScore,
        dimensionScores: profile.dimensionScores,
        selfReportScores: profile.selfReportScores,
        indicatorBreakdown: profile.indicatorBreakdown,
        discernmentGap: profile.discernmentGap,
        createdAt: profile.createdAt,
      });
    }
  );

  // GET /history — All profiles for current user
  fastify.get(
    '/history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.currentUser!;

      const profiles = await fastify.prisma.fluencyProfile.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          overallScore: true,
          dimensionScores: true,
          discernmentGap: true,
          algorithmVersion: true,
          createdAt: true,
          session: {
            select: {
              id: true,
              template: { select: { name: true, roleProfile: true } },
            },
          },
        },
      });

      return reply.code(200).send({
        data: profiles,
        total: profiles.length,
      });
    }
  );
}
