/**
 * Tier Routes
 *
 * GET /api/v1/tier/status — Returns tier, remaining messages, limit
 *
 * Authenticated endpoint that returns the user's current tier
 * and message usage information.
 *
 * [IMPL-084][FR-028]
 */

import { FastifyPluginAsync } from 'fastify';
import { TierService } from '../services/tier.service';
import { sendSuccess } from '../lib/response';

const tierRoutes: FastifyPluginAsync = async (fastify) => {
  const tierService = new TierService(fastify.prisma);

  // GET /api/v1/tier/status
  fastify.get(
    '/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get current tier status and message allowance',
        tags: ['Tier'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tier: { type: 'string' },
                  messagesUsed: { type: 'integer' },
                  messagesLimit: { type: ['integer', 'null'] },
                  messagesRemaining: { type: ['integer', 'null'] },
                  isUnlimited: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const allowance = await tierService.getRemainingMessages(userId);

      return sendSuccess(reply, {
        tier: allowance.tier,
        messagesUsed: allowance.tier === 'FREE'
          ? (allowance.limit! - allowance.remaining!)
          : 0,
        messagesLimit: allowance.limit,
        messagesRemaining: allowance.remaining,
        isUnlimited: allowance.limit === null,
      });
    }
  );
};

export default tierRoutes;
