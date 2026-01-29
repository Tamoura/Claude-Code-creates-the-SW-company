import { FastifyPluginAsync } from 'fastify';
import {
  createIncident,
  getIncident,
  listIncidents,
  updateIncident,
  deleteIncident,
} from '../../services/incident.service.js';
import {
  createIncidentSchema,
  updateIncidentSchema,
  listIncidentsQuerySchema,
} from '../../schemas/incident.schema.js';
import { parsePaginationParams } from '../../utils/pagination.js';

const incidentsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create incident
  fastify.post('/incidents', async (request, reply) => {
    const data = createIncidentSchema.parse(request.body);
    const incident = await createIncident(fastify.prisma, data);
    return reply.status(201).send(incident);
  });

  // List incidents
  fastify.get('/incidents', async (request) => {
    const query = listIncidentsQuerySchema.parse(request.query);
    const { page, limit } = parsePaginationParams(query.page, query.limit);

    const filters = {
      page,
      limit,
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
    };

    return await listIncidents(fastify.prisma, filters);
  });

  // Get incident by ID
  fastify.get('/incidents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await getIncident(fastify.prisma, id);

    if (!incident) {
      return reply.status(404).send({ error: 'Incident not found' });
    }

    return incident;
  });

  // Update incident
  fastify.patch('/incidents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateIncidentSchema.parse(request.body);

    // For now, use a dummy user ID since auth is not enforced
    const userId = 'system';

    try {
      const incident = await updateIncident(fastify.prisma, id, data, userId);
      return incident;
    } catch (error) {
      return reply.status(404).send({ error: 'Incident not found' });
    }
  });

  // Delete incident
  fastify.delete('/incidents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // For now, use a dummy user ID since auth is not enforced
    const userId = 'system';

    try {
      await deleteIncident(fastify.prisma, id, userId);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({ error: 'Incident not found' });
    }
  });
};

export default incidentsRoutes;
