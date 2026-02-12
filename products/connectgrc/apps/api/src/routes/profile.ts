import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors';

// Schemas
const updateProfileSchema = z.object({
  headline: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'PRINCIPAL']).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  cvUrl: z.string().url().optional(),
});

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /profile - Get current user's profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: request.currentUser!.id },
        include: {
          domainScores: true,
        },
      });

      return reply.send({ profile });
    },
  });

  // PUT /profile - Create or update profile
  fastify.put('/profile', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: parsed.error.issues,
          },
        });
      }
      const data = parsed.data;

      // Check if profile exists
      const existing = await fastify.prisma.profile.findUnique({
        where: { userId: request.currentUser!.id },
      });

      let profile;
      if (existing) {
        // Update
        profile = await fastify.prisma.profile.update({
          where: { userId: request.currentUser!.id },
          data: {
            ...data,
            linkedinUrl: data.linkedinUrl === '' ? null : data.linkedinUrl,
          },
        });
      } else {
        // Create
        profile = await fastify.prisma.profile.create({
          data: {
            userId: request.currentUser!.id,
            ...data,
            linkedinUrl: data.linkedinUrl === '' ? null : data.linkedinUrl,
          },
        });
      }

      return reply.send({ profile });
    },
  });

  // GET /profile/:userId - Get public profile view
  fastify.get<{ Params: { userId: string } }>('/profile/:userId', async (request, reply) => {
    const { userId } = request.params;

    // Check if user exists
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get profile
    const profile = await fastify.prisma.profile.findUnique({
      where: { userId },
      include: {
        domainScores: true,
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Remove sensitive fields for public view
    const publicProfile = {
      ...profile,
      phone: undefined,
    };

    return reply.send({ profile: publicProfile });
  });

  // GET /profile/domain-scores - Get current user's domain scores
  fastify.get('/profile/domain-scores', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: request.currentUser!.id },
        include: {
          domainScores: true,
        },
      });

      const domainScores = profile?.domainScores || [];

      return reply.send({ domainScores });
    },
  });
};

export default profileRoutes;
