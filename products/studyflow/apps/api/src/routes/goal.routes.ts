import { FastifyPluginAsync } from 'fastify';
import { GoalRepository } from '../repositories/goal.repository';
import { GoalService } from '../services/goal.service';
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalsQuerySchema,
  goalIdParamSchema,
} from '../schemas/goal.schema';
import { validate } from '../lib/validate';
import { requireStudentId } from '../lib/request';

/**
 * Goal routes (US-06/08/11, FR-011..013/022/023). Auth required; ownership via
 * selection.studentId (BR-004). Status is recomputed/persisted on writes.
 */
const goalRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GoalService(new GoalRepository(fastify.prisma));

  fastify.addHook('preHandler', fastify.sessionAuth);

  fastify.post('/goals', async (request, reply) => {
    const studentId = requireStudentId(request);
    const input = validate(createGoalSchema, request.body);
    return reply.code(201).send(await service.create(studentId, input));
  });

  fastify.get('/goals', async (request, reply) => {
    const studentId = requireStudentId(request);
    const query = validate(listGoalsQuerySchema, request.query);
    return reply.send(await service.list(studentId, query));
  });

  fastify.get('/goals/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(goalIdParamSchema, request.params);
    return reply.send(await service.getDetail(studentId, id));
  });

  fastify.patch('/goals/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(goalIdParamSchema, request.params);
    const input = validate(updateGoalSchema, request.body);
    return reply.send(await service.update(studentId, id, input));
  });

  fastify.post('/goals/:id/abandon', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(goalIdParamSchema, request.params);
    return reply.send(await service.abandon(studentId, id));
  });

  fastify.delete('/goals/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(goalIdParamSchema, request.params);
    await service.remove(studentId, id);
    return reply.code(204).send();
  });
};

export default goalRoutes;
