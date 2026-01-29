import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { createPaymentSessionSchema, listPaymentSessionsQuerySchema, updatePaymentSessionSchema, validateBody, validateQuery } from '../../utils/validation.js';
import { PaymentService } from '../../services/payment.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const paymentSessionRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/payment-sessions
  fastify.post('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const body = validateBody(createPaymentSessionSchema, request.body);
      const userId = request.currentUser!.id;

      const paymentService = new PaymentService(fastify.prisma);
      const session = await paymentService.createPaymentSession(userId, body);

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const response = paymentService.toResponse(session, baseUrl);

      logger.info('Payment session created', {
        userId,
        paymentSessionId: session.id,
        amount: session.amount,
      });

      return reply.code(201).send(response);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error creating payment session', error);
      throw error;
    }
  });

  // GET /v1/payment-sessions
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    try {
      const query = validateQuery(listPaymentSessionsQuerySchema, request.query);
      const userId = request.currentUser!.id;

      const paymentService = new PaymentService(fastify.prisma);
      const { data, total } = await paymentService.listPaymentSessions(userId, {
        limit: query.limit,
        offset: query.offset,
        status: query.status,
        network: query.network,
        created_after: query.created_after ? new Date(query.created_after) : undefined,
        created_before: query.created_before ? new Date(query.created_before) : undefined,
      });

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const sessions = data.map(s => paymentService.toResponse(s, baseUrl));

      return reply.send({
        data: sessions,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total,
          has_more: (query.offset ?? 0) + (query.limit ?? 20) < total,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error listing payment sessions', error);
      throw error;
    }
  });

  // GET /v1/payment-sessions/:id
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('read')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      const paymentService = new PaymentService(fastify.prisma);
      const session = await paymentService.getPaymentSession(id, userId);

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const response = paymentService.toResponse(session, baseUrl);

      return reply.send(response);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error getting payment session', error);
      throw error;
    }
  });

  // PATCH /v1/payment-sessions/:id
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      // Validate request body
      const updates = validateBody(updatePaymentSessionSchema, request.body);

      const paymentService = new PaymentService(fastify.prisma);

      // Get existing session and verify ownership (this will throw 404 if not found or not owned)
      await paymentService.getPaymentSession(id, userId);

      // Build update data with only allowed fields (security: whitelist prevents mass assignment)
      const updateData: any = {};

      if (updates.customer_address !== undefined) {
        updateData.customerAddress = updates.customer_address;
      }

      if (updates.tx_hash !== undefined) {
        updateData.txHash = updates.tx_hash;
      }

      if (updates.block_number !== undefined) {
        updateData.blockNumber = updates.block_number;
      }

      if (updates.confirmations !== undefined) {
        updateData.confirmations = updates.confirmations;
      }

      if (updates.status !== undefined) {
        updateData.status = updates.status;

        // Auto-set completedAt when status changes to COMPLETED
        if (updates.status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
      }

      // Update payment session
      const updatedSession = await fastify.prisma.paymentSession.update({
        where: { id },
        data: updateData,
      });

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const response = paymentService.toResponse(updatedSession, baseUrl);

      logger.info('Payment session updated', {
        userId,
        paymentSessionId: id,
        updatedFields: Object.keys(updateData),
      });

      return reply.send(response);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      logger.error('Error updating payment session', error);
      throw error;
    }
  });

  // GET /v1/payment-sessions/:id/events (SSE)
  fastify.get('/:id/events', async (request, reply) => {
    try {
      let userId: string;

      // Try to get token from query parameter first (for EventSource compatibility)
      const { token } = request.query as { token?: string };

      if (token) {
        // Manually verify JWT from query parameter
        try {
          const decoded = fastify.jwt.verify(token) as { userId: string };
          userId = decoded.userId;
        } catch (error) {
          // Invalid token in query parameter
          reply.raw.writeHead(401, { 'Content-Type': 'text/plain' });
          reply.raw.end('Unauthorized: Invalid token');
          return;
        }
      } else {
        // Fall back to Authorization header (for backward compatibility)
        try {
          await request.jwtVerify();
          userId = (request.user as { userId: string }).userId;
        } catch (error) {
          // No token provided at all
          reply.raw.writeHead(401, { 'Content-Type': 'text/plain' });
          reply.raw.end('Unauthorized: Missing authentication token');
          return;
        }
      }

      const { id } = request.params as { id: string };

      // Get payment session and verify ownership
      const session = await fastify.prisma.paymentSession.findUnique({
        where: { id },
      });

      if (!session) {
        reply.raw.writeHead(404, { 'Content-Type': 'text/plain' });
        reply.raw.end('Payment session not found');
        return;
      }

      // Verify user owns this payment session
      if (session.userId !== userId) {
        reply.raw.writeHead(403, { 'Content-Type': 'text/plain' });
        reply.raw.end('Access denied to this payment session');
        return;
      }

      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const data = {
        status: session.status,
        confirmations: session.confirmations,
        tx_hash: session.txHash,
      };

      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        reply.raw.write(': heartbeat\n\n');
      }, 30000);

      // Clean up on close
      request.raw.on('close', () => {
        clearInterval(heartbeat);
        reply.raw.end();
      });
    } catch (error) {
      logger.error('Error in SSE stream', error);
      reply.raw.writeHead(500, { 'Content-Type': 'text/plain' });
      reply.raw.end('Internal server error');
    }
  });
};

export default paymentSessionRoutes;
