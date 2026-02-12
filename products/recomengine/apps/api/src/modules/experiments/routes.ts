import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateBody, createExperimentSchema, updateExperimentSchema } from '../../utils/validation';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors';
import { parsePagination, paginatedResult } from '../../utils/pagination';
import { computeExperimentResults, VariantMetrics } from './statistics';

export default async function experimentRoutes(fastify: FastifyInstance) {
  // GET /tenants/:tenantId/experiments
  fastify.get<{ Params: { tenantId: string } }>('/:tenantId/experiments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { limit, offset } = parsePagination(query);

    const where: Record<string, unknown> = { tenantId: request.params.tenantId };
    if (query.status) where.status = query.status;

    // Verify tenant ownership
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const [experiments, total] = await Promise.all([
      fastify.prisma.experiment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.experiment.count({ where }),
    ]);

    return paginatedResult(experiments, total, { limit, offset });
  });

  // POST /tenants/:tenantId/experiments
  fastify.post<{ Params: { tenantId: string } }>('/:tenantId/experiments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = validateBody(createExperimentSchema, request.body);

    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const experiment = await fastify.prisma.experiment.create({
      data: {
        tenantId: request.params.tenantId,
        name: data.name,
        controlStrategy: data.controlStrategy,
        variantStrategy: data.variantStrategy,
        trafficSplit: data.trafficSplit,
        metric: data.metric,
        placementId: data.placementId,
      },
    });

    // Create initial result rows
    await fastify.prisma.experimentResult.createMany({
      data: [
        { experimentId: experiment.id, variant: 'control' },
        { experimentId: experiment.id, variant: 'variant' },
      ],
    });

    return reply.status(201).send({ data: experiment });
  });

  // GET /tenants/:tenantId/experiments/:experimentId
  fastify.get<{ Params: { tenantId: string; experimentId: string } }>('/:tenantId/experiments/:experimentId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const experiment = await fastify.prisma.experiment.findFirst({
      where: { id: request.params.experimentId, tenantId: request.params.tenantId },
    });
    if (!experiment) throw new NotFoundError('Experiment not found');

    return { data: experiment };
  });

  // PUT /tenants/:tenantId/experiments/:experimentId
  fastify.put<{ Params: { tenantId: string; experimentId: string } }>('/:tenantId/experiments/:experimentId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const data = validateBody(updateExperimentSchema, request.body);

    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const experiment = await fastify.prisma.experiment.findFirst({
      where: { id: request.params.experimentId, tenantId: request.params.tenantId },
    });
    if (!experiment) throw new NotFoundError('Experiment not found');

    // Validate status transitions
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['running'],
        running: ['paused', 'completed'],
        paused: ['running', 'completed'],
        completed: [],
      };
      if (!validTransitions[experiment.status]?.includes(data.status)) {
        throw new BadRequestError(`Cannot transition from '${experiment.status}' to '${data.status}'`);
      }

      // Check unique running constraint
      if (data.status === 'running' && experiment.placementId) {
        const existing = await fastify.prisma.experiment.findFirst({
          where: {
            tenantId: request.params.tenantId,
            placementId: experiment.placementId,
            status: 'running',
            id: { not: experiment.id },
          },
        });
        if (existing) {
          throw new ConflictError('Another experiment is already running for this placement');
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.trafficSplit) updateData.trafficSplit = data.trafficSplit;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'running') updateData.startedAt = new Date();
      if (data.status === 'completed') updateData.completedAt = new Date();
    }

    const updated = await fastify.prisma.experiment.update({
      where: { id: request.params.experimentId },
      data: updateData,
    });

    return { data: updated };
  });

  // DELETE /tenants/:tenantId/experiments/:experimentId
  fastify.delete<{ Params: { tenantId: string; experimentId: string } }>('/:tenantId/experiments/:experimentId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const experiment = await fastify.prisma.experiment.findFirst({
      where: { id: request.params.experimentId, tenantId: request.params.tenantId },
    });
    if (!experiment) throw new NotFoundError('Experiment not found');

    if (experiment.status === 'running' || experiment.status === 'paused') {
      throw new BadRequestError('Cannot delete a running or paused experiment');
    }

    await fastify.prisma.experiment.delete({
      where: { id: request.params.experimentId },
    });

    return { data: { message: 'Experiment deleted' } };
  });

  // GET /tenants/:tenantId/experiments/:experimentId/results
  fastify.get<{ Params: { tenantId: string; experimentId: string } }>('/:tenantId/experiments/:experimentId/results', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const tenant = await fastify.prisma.tenant.findFirst({
      where: { id: request.params.tenantId, ownerId: request.user!.id },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const experiment = await fastify.prisma.experiment.findFirst({
      where: { id: request.params.experimentId, tenantId: request.params.tenantId },
      include: { results: true },
    });
    if (!experiment) throw new NotFoundError('Experiment not found');

    const controlResult = experiment.results.find(r => r.variant === 'control');
    const variantResult = experiment.results.find(r => r.variant === 'variant');

    const controlMetrics: VariantMetrics = {
      impressions: controlResult?.impressions || 0,
      clicks: controlResult?.clicks || 0,
      conversions: controlResult?.conversions || 0,
      revenue: Number(controlResult?.revenue || 0),
      sampleSize: controlResult?.sampleSize || 0,
    };

    const variantMetrics: VariantMetrics = {
      impressions: variantResult?.impressions || 0,
      clicks: variantResult?.clicks || 0,
      conversions: variantResult?.conversions || 0,
      revenue: Number(variantResult?.revenue || 0),
      sampleSize: variantResult?.sampleSize || 0,
    };

    const stats = computeExperimentResults(experiment.metric, controlMetrics, variantMetrics);

    return {
      data: {
        experimentId: experiment.id,
        experimentName: experiment.name,
        status: experiment.status,
        metric: experiment.metric,
        control: {
          strategy: experiment.controlStrategy,
          ...controlMetrics,
          metricValue: stats.controlMetricValue,
          confidenceInterval: stats.controlConfidenceInterval,
        },
        variant: {
          strategy: experiment.variantStrategy,
          ...variantMetrics,
          metricValue: stats.variantMetricValue,
          confidenceInterval: stats.variantConfidenceInterval,
        },
        lift: stats.lift,
        pValue: stats.pValue,
        isSignificant: stats.isSignificant,
        duration: {
          startedAt: experiment.startedAt,
          days: experiment.startedAt
            ? Math.ceil((Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        },
      },
    };
  });
}
