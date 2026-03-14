import { FastifyPluginAsync } from 'fastify';
import { RadarService } from '../services/radar.service';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';

const radarRoutes: FastifyPluginAsync = async (fastify) => {
  const radarService = new RadarService(fastify.prisma);

  // ==========================================================
  // GET /api/v1/radar — List all tech radar items
  // ==========================================================
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;

      // Get user's tech stack from company profile
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const profile = await fastify.prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });

      const techStack = profile
        ? (profile.techStack as {
            languages?: string[];
            frameworks?: string[];
            databases?: string[];
          })
        : undefined;

      const query = request.query as { groupBy?: string };

      if (query.groupBy === 'quadrant') {
        const grouped =
          await radarService.getItemsGroupedByQuadrant(techStack);
        return sendSuccess(reply, { grouped });
      }

      const items = await radarService.getAllItems(techStack);
      return sendSuccess(reply, { items });
    }
  );

  // ==========================================================
  // GET /api/v1/radar/:id — Tech radar item detail
  // ==========================================================
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const { id } = request.params as { id: string };

      // Get user's tech stack and org info
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) throw AppError.notFound('User not found');

      const profile = await fastify.prisma.companyProfile.findUnique({
        where: { organizationId: user.organizationId },
      });

      const org = await fastify.prisma.organization.findUnique({
        where: { id: user.organizationId },
      });

      const techStack = profile
        ? (profile.techStack as {
            languages?: string[];
            frameworks?: string[];
            databases?: string[];
          })
        : undefined;

      const detail = await radarService.getItemDetail(
        id,
        techStack,
        org?.industry,
        org?.employeeCount
      );

      return sendSuccess(reply, detail);
    }
  );
};

export default radarRoutes;
