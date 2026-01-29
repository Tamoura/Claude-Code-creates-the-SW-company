import { FastifyPluginAsync } from 'fastify';
import {
  createServiceRequest,
  getServiceRequest,
  listServiceRequests,
  updateServiceRequest,
  deleteServiceRequest,
  approveServiceRequest,
  rejectServiceRequest,
  fulfillServiceRequest,
  completeServiceRequest,
  createCatalogItem,
  getCatalogItem,
  listCatalogItems,
  updateCatalogItem,
} from '../../services/service-request.service.js';
import {
  createServiceRequestSchema,
  updateServiceRequestSchema,
  listServiceRequestsQuerySchema,
  approveRequestSchema,
  rejectRequestSchema,
  fulfillRequestSchema,
  createCatalogItemSchema,
  updateCatalogItemSchema,
  listCatalogItemsQuerySchema,
} from '../../schemas/service-request.schema.js';
import { parsePaginationParams } from '../../utils/pagination.js';

const serviceRequestsRoutes: FastifyPluginAsync = async (fastify) => {
  // Service Request Routes

  // Create service request
  fastify.post('/service-requests', async (request, reply) => {
    const data = createServiceRequestSchema.parse(request.body);
    const serviceRequest = await createServiceRequest(fastify.prisma, data);
    return reply.status(201).send(serviceRequest);
  });

  // List service requests
  fastify.get('/service-requests', async (request) => {
    const query = listServiceRequestsQuerySchema.parse(request.query);
    const { page, limit } = parsePaginationParams(query.page, query.limit);

    const filters = {
      page,
      limit,
      status: query.status,
      priority: query.priority,
      requesterId: query.requesterId,
      fulfillerId: query.fulfillerId,
      catalogItemId: query.catalogItemId,
    };

    return await listServiceRequests(fastify.prisma, filters);
  });

  // Get service request by ID
  fastify.get('/service-requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const serviceRequest = await getServiceRequest(fastify.prisma, id);

    if (!serviceRequest) {
      return reply.status(404).send({ error: 'Service request not found' });
    }

    return serviceRequest;
  });

  // Update service request
  fastify.patch('/service-requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateServiceRequestSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const serviceRequest = await updateServiceRequest(fastify.prisma, id, data, userId);
      return serviceRequest;
    } catch (error) {
      return reply.status(404).send({ error: 'Service request not found' });
    }
  });

  // Delete service request
  fastify.delete('/service-requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access

    try {
      await deleteServiceRequest(fastify.prisma, id, userId);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({ error: 'Service request not found' });
    }
  });

  // Approve service request
  fastify.post('/service-requests/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = approveRequestSchema.parse(request.body);

    try {
      const serviceRequest = await approveServiceRequest(fastify.prisma, id, data);
      return serviceRequest;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Reject service request
  fastify.post('/service-requests/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = rejectRequestSchema.parse(request.body);

    try {
      const serviceRequest = await rejectServiceRequest(fastify.prisma, id, data);
      return serviceRequest;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Fulfill service request
  fastify.post('/service-requests/:id/fulfill', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = fulfillRequestSchema.parse(request.body);

    try {
      const serviceRequest = await fulfillServiceRequest(fastify.prisma, id, data);
      return serviceRequest;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Complete service request
  fastify.post('/service-requests/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access
    const { notes } = request.body as { notes?: string };

    try {
      const serviceRequest = await completeServiceRequest(fastify.prisma, id, userId, notes);
      return serviceRequest;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Service Catalog Routes

  // Create catalog item
  fastify.post('/catalog', async (request, reply) => {
    const data = createCatalogItemSchema.parse(request.body);
    const catalogItem = await createCatalogItem(fastify.prisma, data);
    return reply.status(201).send(catalogItem);
  });

  // List catalog items
  fastify.get('/catalog', async (request) => {
    const query = listCatalogItemsQuerySchema.parse(request.query);
    const { page, limit } = parsePaginationParams(query.page, query.limit);

    const filters = {
      page,
      limit,
      categoryId: query.categoryId,
      isActive: query.isActive,
    };

    return await listCatalogItems(fastify.prisma, filters);
  });

  // Get catalog item by ID
  fastify.get('/catalog/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const catalogItem = await getCatalogItem(fastify.prisma, id);

    if (!catalogItem) {
      return reply.status(404).send({ error: 'Catalog item not found' });
    }

    return catalogItem;
  });

  // Update catalog item
  fastify.patch('/catalog/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateCatalogItemSchema.parse(request.body);

    try {
      const catalogItem = await updateCatalogItem(fastify.prisma, id, data);
      return catalogItem;
    } catch (error) {
      return reply.status(404).send({ error: 'Catalog item not found' });
    }
  });
};

export default serviceRequestsRoutes;
