import { FastifyPluginAsync } from 'fastify';
import { ProfileService } from '../services/profile.service';
import {
  stepSchemas,
  companyProfileUpdateSchema,
} from '../validations/profile.validation';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const profileService = new ProfileService(fastify.prisma);

  // ==========================================================
  // Onboarding routes: /api/v1/onboarding
  // ==========================================================

  // GET /api/v1/onboarding/step/:step
  fastify.get(
    '/api/v1/onboarding/step/:step',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { step } = request.params as { step: string };
      const stepNum = parseInt(step, 10);

      if (isNaN(stepNum) || stepNum < 1 || stepNum > 4) {
        throw AppError.badRequest(
          'Invalid step number. Must be 1-4.'
        );
      }

      const userId = (request.user as { sub: string }).sub;
      const result = await profileService.getOnboardingStep(
        userId,
        stepNum
      );

      return sendSuccess(reply, result);
    }
  );

  // PUT /api/v1/onboarding/step/:step
  fastify.put(
    '/api/v1/onboarding/step/:step',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { step } = request.params as { step: string };
      const stepNum = parseInt(step, 10);

      if (isNaN(stepNum) || stepNum < 1 || stepNum > 4) {
        throw AppError.badRequest(
          'Invalid step number. Must be 1-4.'
        );
      }

      const schema = stepSchemas[stepNum];
      const parsed = schema.safeParse(request.body || {});
      if (!parsed.success) {
        throw parsed.error;
      }

      const userId = (request.user as { sub: string }).sub;
      await profileService.saveOnboardingStep(
        userId,
        stepNum,
        parsed.data as Record<string, unknown>
      );

      return sendSuccess(reply, {
        message: `Step ${stepNum} saved successfully`,
      });
    }
  );

  // PUT /api/v1/onboarding/complete
  fastify.put(
    '/api/v1/onboarding/complete',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      await profileService.completeOnboarding(userId);

      return sendSuccess(reply, {
        message: 'Onboarding completed successfully',
      });
    }
  );

  // ==========================================================
  // Profile routes: /api/v1/profile
  // ==========================================================

  // GET /api/v1/profile/company
  fastify.get(
    '/api/v1/profile/company',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const profile = await profileService.getCompanyProfile(userId);

      return sendSuccess(reply, profile);
    }
  );

  // PUT /api/v1/profile/company
  fastify.put(
    '/api/v1/profile/company',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = companyProfileUpdateSchema.safeParse(
        request.body || {}
      );
      if (!parsed.success) {
        throw parsed.error;
      }

      const userId = (request.user as { sub: string }).sub;
      const profile = await profileService.updateCompanyProfile(
        userId,
        parsed.data as Record<string, unknown>
      );

      return sendSuccess(reply, profile);
    }
  );

  // GET /api/v1/profile/completeness
  fastify.get(
    '/api/v1/profile/completeness',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const profile = await profileService.getCompanyProfile(userId);
      const completeness =
        (profile.profileCompleteness as number) ?? 0;

      return sendSuccess(reply, { completeness });
    }
  );
};

export default profileRoutes;
