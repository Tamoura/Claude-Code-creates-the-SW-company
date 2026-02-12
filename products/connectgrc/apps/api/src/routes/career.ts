import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const simulateCareerSchema = z.object({
  targetRole: z.string().min(1).max(200),
  targetLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'PRINCIPAL']),
});

const careerRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /career/simulate - Run career simulation
  fastify.post('/career/simulate', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const parsed = simulateCareerSchema.safeParse(request.body);
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

      const { targetRole, targetLevel } = parsed.data;

      // Get user profile
      const profile = await fastify.prisma.profile.findUnique({
        where: { userId: request.currentUser!.id },
        include: { domainScores: true },
      });

      const currentLevel = profile?.experienceLevel || 'ENTRY';

      // Simple skill gap analysis
      const skillGaps = {
        technical: ['Risk Assessment', 'Compliance Frameworks'],
        soft: ['Leadership', 'Communication'],
      };

      const recommendations = [
        'Complete advanced GRC certifications',
        'Gain experience in regulatory compliance',
        'Lead cross-functional projects',
      ];

      // Estimate time based on level gap
      const levelOrder = ['ENTRY', 'MID', 'SENIOR', 'PRINCIPAL'];
      const currentIndex = levelOrder.indexOf(currentLevel);
      const targetIndex = levelOrder.indexOf(targetLevel);
      const estimatedMonths = Math.max(0, (targetIndex - currentIndex) * 12);

      // Create simulation
      const simulation = await fastify.prisma.careerSimulation.create({
        data: {
          userId: request.currentUser!.id,
          targetRole,
          currentLevel,
          targetLevel,
          skillGaps,
          recommendations,
          estimatedMonths,
        },
      });

      return reply.code(201).send({ simulation });
    },
  });

  // GET /career/simulations - List user's simulations
  fastify.get('/career/simulations', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const simulations = await fastify.prisma.careerSimulation.findMany({
        where: { userId: request.currentUser!.id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ simulations });
    },
  });

  // GET /career/learning-paths - List learning paths
  fastify.get<{
    Querystring: {
      domain?: string;
      level?: string;
    };
  }>('/career/learning-paths', async (request, reply) => {
    const { domain, level } = request.query;

    const where: any = { active: true };
    if (domain) where.domain = domain;
    if (level) where.level = level;

    const paths = await fastify.prisma.learningPath.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ paths });
  });
};

export default careerRoutes;
