/**
 * Copilot Runtime Routes
 *
 * POST /api/v1/copilot/run — Run the advisory agent
 *
 * Authenticated endpoint that accepts a user message, runs
 * the advisory agent, and returns the response with citations,
 * confidence, and AI disclaimer.
 *
 * Rate limited to 20 req/min for LLM endpoints (per addendum).
 *
 * [IMPL-034][FR-002][FR-029][US-01][US-02]
 */

import { FastifyPluginAsync } from 'fastify';
import { CopilotService } from '../services/copilot.service';
import { TierService } from '../services/tier.service';
import { sendSuccess, sendError } from '../lib/response';
import { AppError } from '../lib/errors';
import { AI_DISCLAIMER } from '../agent/nodes/synthesizer';

const copilotRoutes: FastifyPluginAsync = async (fastify) => {
  const copilotService = new CopilotService(fastify.prisma);
  const tierService = new TierService(fastify.prisma);

  // POST /api/v1/copilot/run
  fastify.post(
    '/run',
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        description: 'Run the CTO advisory agent with a user message',
        tags: ['Copilot'],
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              maxLength: 10000,
              description: 'User message (1-10,000 characters)',
            },
            conversationId: {
              type: ['string', 'null'],
              description: 'Existing conversation ID (null for new)',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  response: { type: 'string' },
                  confidence: { type: 'string' },
                  route: { type: 'string' },
                  disclaimer: { type: 'string' },
                  citations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        marker: { type: 'string' },
                        sourceTitle: { type: 'string' },
                        author: { type: ['string', 'null'] },
                        relevanceScore: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { message, conversationId } = request.body as {
        message: string;
        conversationId: string | null;
      };

      // Validate message is not empty/whitespace
      if (!message || message.trim().length === 0) {
        return sendError(
          reply,
          400,
          'VALIDATION_ERROR',
          'Message must not be empty'
        );
      }

      const userId = (request.user as { sub: string }).sub;

      // Free tier enforcement [FR-028]
      const allowance = await tierService.getRemainingMessages(userId);
      if (!allowance.allowed) {
        throw new AppError(
          allowance.upgradeCta || 'Daily message limit reached',
          429,
          'TIER_LIMIT_REACHED'
        );
      }

      const result = await copilotService.run({
        message: message.trim(),
        conversationId: conversationId ?? null,
        userId,
      });

      // Increment message count after successful response [FR-028]
      await tierService.incrementMessageCount(userId);

      // Set AI disclaimer header
      reply.header('X-AI-Disclaimer', AI_DISCLAIMER);

      return sendSuccess(reply, {
        response: result.response,
        citations: result.citations,
        confidence: result.confidence,
        route: result.route,
        disclaimer: result.disclaimer,
      });
    }
  );
};

export default copilotRoutes;
