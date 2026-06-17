import { FastifyPluginAsync } from 'fastify';
import { ProgressRepository } from '../repositories/progress.repository';
import { GoalRepository } from '../repositories/goal.repository';
import { ProgressService } from '../services/progress.service';
import { GoalService } from '../services/goal.service';
import {
  createProgressSchema,
  updateProgressSchema,
  goalIdParamSchema,
  progressIdParamSchema,
} from '../schemas/progress.schema';
import { validate } from '../lib/validate';
import { requireStudentId } from '../lib/request';

/**
 * Progress routes (US-07/08/11, FR-014..018/022). Entry writes recompute and
 * persist the parent goal's status. Auth required; ownership-scoped (BR-004).
 */
const progressRoutes: FastifyPluginAsync = async (fastify) => {
  const goalService = new GoalService(new GoalRepository(fastify.prisma));
  const service = new ProgressService(
    new ProgressRepository(fastify.prisma),
    goalService
  );

  fastify.addHook('preHandler', fastify.sessionAuth);

  fastify.post('/goals/:goalId/progress', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { goalId } = validate(goalIdParamSchema, request.params);
    const input = validate(createProgressSchema, request.body ?? {});
    return reply.code(201).send(await service.create(studentId, goalId, input));
  });

  fastify.get('/goals/:goalId/progress', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { goalId } = validate(goalIdParamSchema, request.params);
    return reply.send({ data: await service.listForGoal(studentId, goalId) });
  });

  fastify.patch('/progress/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(progressIdParamSchema, request.params);
    const input = validate(updateProgressSchema, request.body);
    return reply.send(await service.update(studentId, id, input));
  });

  fastify.delete('/progress/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(progressIdParamSchema, request.params);
    await service.remove(studentId, id);
    return reply.code(204).send();
  });
};

export default progressRoutes;
