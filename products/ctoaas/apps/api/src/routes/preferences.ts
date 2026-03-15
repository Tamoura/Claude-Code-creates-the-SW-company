import { FastifyPluginAsync } from 'fastify';
import { PreferenceLearningService } from '../services/preference-learning.service';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';
import { z } from 'zod';

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  feedback: z.enum(['UP', 'DOWN']),
});

const preferencesRoutes: FastifyPluginAsync = async (fastify) => {
  const prefService = new PreferenceLearningService(fastify.prisma);

  // ── GET /api/v1/preferences ───────────────────────────────────
  fastify.get(
    '/api/v1/preferences',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;

      const profile = await prefService.getPreferenceProfile(userId);

      return sendSuccess(reply, profile);
    }
  );

  // ── POST /api/v1/preferences/feedback ─────────────────────────
  fastify.post(
    '/api/v1/preferences/feedback',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = feedbackSchema.safeParse(request.body || {});
      if (!parsed.success) {
        throw parsed.error;
      }

      const userId = (request.user as { sub: string }).sub;

      // Get user's organizationId
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!user) {
        throw AppError.notFound('User not found');
      }

      await prefService.recordFeedback(
        userId,
        user.organizationId,
        parsed.data.messageId,
        parsed.data.feedback
      );

      return sendSuccess(reply, {
        message: 'Feedback recorded',
      });
    }
  );
};

export default preferencesRoutes;
