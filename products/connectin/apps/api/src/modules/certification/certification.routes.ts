import { FastifyPluginAsync } from 'fastify';
import { CertificationService } from './certification.service';
import { sendSuccess } from '../../lib/response';

const certificationRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new CertificationService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/certifications
  fastify.post('/', {
    schema: {
      description: 'Add a certification to your profile',
      tags: ['Certifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'issuingOrg', 'issueDate'],
        properties: {
          name: { type: 'string', maxLength: 200 },
          issuingOrg: { type: 'string', maxLength: 200 },
          credentialId: { type: 'string', maxLength: 100 },
          credentialUrl: { type: 'string', maxLength: 500 },
          issueDate: { type: 'string', format: 'date' },
          expiryDate: { type: 'string', format: 'date' },
        },
      },
      response: { 201: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.addCertification(request.user.sub, request.body as any);
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/certifications
  fastify.get('/', {
    schema: {
      description: 'List your certifications',
      tags: ['Certifications'],
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.listCertifications(request.user.sub);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/certifications/:id
  fastify.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      description: 'Delete a certification',
      tags: ['Certifications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.deleteCertification(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });
};

export default certificationRoutes;
