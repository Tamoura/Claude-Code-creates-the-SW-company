import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { ConnectionService } from './connection.service';
import { sendRequestSchema } from './connection.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';

function zodToDetails(
  err: ZodError
): Array<{ field: string; message: string }> {
  return err.errors.map((e) => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));
}

const connectionRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const connectionService = new ConnectionService(
    fastify.prisma
  );

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/connections/request
  fastify.post('/request', async (request, reply) => {
    const result = sendRequestSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await connectionService.sendRequest(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, data, 201);
  });

  // PUT /api/v1/connections/:id/accept
  fastify.put<{ Params: { id: string } }>(
    '/:id/accept',
    async (request, reply) => {
      const data = await connectionService.acceptRequest(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // PUT /api/v1/connections/:id/reject
  fastify.put<{ Params: { id: string } }>(
    '/:id/reject',
    async (request, reply) => {
      const data = await connectionService.rejectRequest(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/connections
  fastify.get('/', async (request, reply) => {
    const result = await connectionService.listConnections(
      request.user.sub,
      request.query as { page?: string; limit?: string }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // GET /api/v1/connections/pending
  fastify.get('/pending', async (request, reply) => {
    const data = await connectionService.listPending(
      request.user.sub
    );
    return sendSuccess(reply, data, 200, {
      incomingCount: data.incoming.length,
      outgoingCount: data.outgoing.length,
    } as any);
  });
};

export default connectionRoutes;
