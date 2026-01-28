import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { createPaymentSessionSchema, listPaymentSessionsQuerySchema, validateBody, validateQuery } from '../../utils/validation.js';
import { PaymentService } from '../../services/payment.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const paymentSessionRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/payment-sessions
  fastify.post('/', {
    onRequest: [fastify.authenticate],
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
    onRequest: [fastify.authenticate],
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
    onRequest: [fastify.authenticate],
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

  // GET /v1/payment-sessions/:id/events (SSE)
  fastify.get('/:id/events', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // Send initial payment status
      const session = await fastify.prisma.paymentSession.findUnique({
        where: { id },
      });

      if (!session) {
        reply.raw.write(`data: ${JSON.stringify({ error: 'Payment session not found' })}\n\n`);
        reply.raw.end();
        return;
      }

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
      reply.raw.end();
    }
  });
};

export default paymentSessionRoutes;
