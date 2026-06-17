import { FastifyPluginAsync } from 'fastify';
import { SelectionRepository } from '../repositories/selection.repository';
import { SelectionService } from '../services/selection.service';
import {
  createSelectionSchema,
  selectionIdParamSchema,
} from '../schemas/selection.schema';
import { validate } from '../lib/validate';
import { requireStudentId } from '../lib/request';

/**
 * Selection routes (US-04/11/13, FR-007/008/025). Add/list/remove a subject in
 * the active-term plan. Auth required; ownership-scoped (BR-004).
 */
const selectionRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new SelectionService(new SelectionRepository(fastify.prisma));

  fastify.addHook('preHandler', fastify.sessionAuth);

  fastify.post('/selections', async (request, reply) => {
    const studentId = requireStudentId(request);
    const input = validate(createSelectionSchema, request.body);
    const result = await service.create(studentId, input);
    return reply.code(201).send(result);
  });

  fastify.get('/selections', async (request, reply) => {
    const studentId = requireStudentId(request);
    return reply.send({ data: await service.list(studentId) });
  });

  fastify.delete('/selections/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(selectionIdParamSchema, request.params);
    await service.remove(studentId, id);
    return reply.code(204).send();
  });
};

export default selectionRoutes;
