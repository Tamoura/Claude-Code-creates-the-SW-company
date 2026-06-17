import { FastifyPluginAsync } from 'fastify';
import { SubjectRepository } from '../repositories/subject.repository';
import { SubjectService } from '../services/subject.service';
import {
  listSubjectsQuerySchema,
  compareQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  idParamSchema,
} from '../schemas/subject.schema';
import { validate } from '../lib/validate';
import { requireStudentId } from '../lib/request';

/**
 * Catalog + manual subject routes (US-02/03/05/11, FR-004..010). All require a
 * session. `/subjects/compare` is registered before `/subjects/:id` so the
 * static path is matched first.
 */
const subjectRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new SubjectService(new SubjectRepository(fastify.prisma));

  // All routes in this plugin require auth.
  fastify.addHook('preHandler', fastify.sessionAuth);

  fastify.get('/subjects', async (request, reply) => {
    const studentId = requireStudentId(request);
    const query = validate(listSubjectsQuerySchema, request.query);
    return reply.send(await service.list(studentId, query));
  });

  fastify.get('/subjects/compare', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { ids } = validate(compareQuerySchema, request.query);
    const subjects = await service.compare(studentId, ids);
    return reply.send({ subjects });
  });

  fastify.get('/subjects/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(idParamSchema, request.params);
    return reply.send(await service.getById(studentId, id));
  });

  fastify.post('/subjects', async (request, reply) => {
    const studentId = requireStudentId(request);
    const input = validate(createSubjectSchema, request.body);
    const result = await service.createManual(studentId, input);
    return reply.code(201).send(result);
  });

  fastify.patch('/subjects/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(idParamSchema, request.params);
    const input = validate(updateSubjectSchema, request.body);
    return reply.send(await service.update(studentId, id, input));
  });

  fastify.delete('/subjects/:id', async (request, reply) => {
    const studentId = requireStudentId(request);
    const { id } = validate(idParamSchema, request.params);
    await service.remove(studentId, id);
    return reply.code(204).send();
  });
};

export default subjectRoutes;
