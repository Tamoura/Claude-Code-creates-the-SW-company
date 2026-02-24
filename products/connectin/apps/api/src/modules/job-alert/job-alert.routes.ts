import { FastifyPluginAsync } from 'fastify';
import { JobAlertService } from './job-alert.service';
import { sendSuccess } from '../../lib/response';

const jobAlertRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new JobAlertService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/job-alerts
  fastify.post('/', {
    schema: {
      description: 'Create a job alert',
      tags: ['Job Alerts'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          keywords: { type: 'string', maxLength: 500 },
          location: { type: 'string', maxLength: 200 },
          workType: { type: 'string', enum: ['ONSITE', 'HYBRID', 'REMOTE'] },
          experienceLevel: { type: 'string', enum: ['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'] },
        },
      },
      response: { 201: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.createAlert(request.user.sub, request.body as any);
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/job-alerts
  fastify.get('/', {
    schema: {
      description: 'List your job alerts',
      tags: ['Job Alerts'],
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.listAlerts(request.user.sub);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/job-alerts/:id
  fastify.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Update a job alert (toggle active/inactive)',
      tags: ['Job Alerts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          isActive: { type: 'boolean' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.updateAlert(request.params.id, request.user.sub, request.body as any);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/job-alerts/:id
  fastify.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Delete a job alert',
      tags: ['Job Alerts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.deleteAlert(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });
};

export default jobAlertRoutes;
