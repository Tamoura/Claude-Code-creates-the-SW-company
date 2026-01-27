import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/me - Get current user profile
  fastify.get(
    '/me',
    {
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // User is already attached to request by authenticate middleware
      return reply.status(200).send({
        user: request.user,
      });
    }
  );
}
