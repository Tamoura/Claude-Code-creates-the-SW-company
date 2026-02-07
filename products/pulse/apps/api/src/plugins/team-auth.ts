/**
 * Team Authorization Plugin
 *
 * Provides a reusable preHandler hook that verifies the
 * authenticated user is a member of the requested team.
 * Extracts teamId from query params, route params, or body.
 * Returns 403 if the user is not a member.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../lib/errors.js';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    verifyTeamMembership: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

const teamAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'verifyTeamMembership',
    async function (request: FastifyRequest, _reply: FastifyReply) {
      const user = request.currentUser;
      if (!user) {
        // Auth should have already run; if no user, skip
        // (the auth hook will have already rejected)
        return;
      }

      const teamId = extractTeamId(request);
      if (!teamId) {
        // No teamId in this request; nothing to verify
        return;
      }

      const membership = await fastify.prisma.teamMember.findFirst({
        where: {
          userId: user.id,
          teamId,
        },
      });

      if (!membership) {
        logger.warn('Team membership denied', {
          userId: user.id,
          teamId,
          url: request.url,
        });
        throw new ForbiddenError(
          'You are not a member of this team'
        );
      }
    }
  );
};

/**
 * Extract teamId from query params, route params, or body.
 */
function extractTeamId(request: FastifyRequest): string | null {
  // Check query params
  const query = request.query as Record<string, unknown>;
  if (query?.teamId && typeof query.teamId === 'string') {
    return query.teamId;
  }

  // Check route params
  const params = request.params as Record<string, unknown>;
  if (params?.teamId && typeof params.teamId === 'string') {
    return params.teamId;
  }

  // Check body
  const body = request.body as Record<string, unknown> | null;
  if (body?.teamId && typeof body.teamId === 'string') {
    return body.teamId;
  }

  return null;
}

export default fp(teamAuthPlugin, {
  name: 'team-auth',
  dependencies: ['prisma', 'auth'],
});
