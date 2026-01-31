/**
 * Refund API Routes
 *
 * Provides refund management functionality:
 * - Create refund requests for completed payments
 * - List refunds with filtering
 * - Get individual refund details
 *
 * Security:
 * - All endpoints require authentication (JWT or API key)
 * - Users can only access their own refunds
 * - Refund permission required for creation
 */

import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { RefundService } from '../../services/refund.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

// Validation schemas
const createRefundSchema = z.object({
  payment_session_id: z.string().min(1, 'Payment session ID is required'),
  amount: z.number().positive('Amount must be greater than 0').refine(
    (val) => {
      // Max 6 decimal places (USDC/USDT precision)
      const parts = val.toString().split('.');
      return !parts[1] || parts[1].length <= 6;
    },
    { message: 'Amount cannot exceed 6 decimal places (USDC/USDT precision)' }
  ),
  reason: z.string().optional(),
});

const listRefundsSchema = z.object({
  payment_session_id: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const refundRoutes: FastifyPluginAsync = async (fastify) => {
  const refundService = new RefundService(fastify.prisma);

  // POST /v1/refunds - Create refund
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('refund')],
    },
    async (request, reply) => {
      try {
        const body = createRefundSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const refund = await refundService.createRefund(userId, body.payment_session_id, {
          amount: body.amount,
          reason: body.reason,
        });

        logger.info('Refund created', {
          userId,
          refundId: refund.id,
          paymentSessionId: refund.paymentSessionId,
          amount: Number(refund.amount),
        });

        return reply.code(201).send(refundService.toResponse(refund));
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
        logger.error('Error creating refund', error);
        throw error;
      }
    }
  );

  // GET /v1/refunds - List refunds
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('read')],
    },
    async (request, reply) => {
      try {
        const query = listRefundsSchema.parse(request.query);
        const userId = request.currentUser!.id;

        const result = await refundService.listRefunds(userId, {
          paymentSessionId: query.payment_session_id,
          status: query.status,
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send({
          data: result.data.map((r) => refundService.toResponse(r)),
          total: result.total,
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
        logger.error('Error listing refunds', error);
        throw error;
      }
    }
  );

  // GET /v1/refunds/:id - Get refund by ID
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('read')],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.currentUser!.id;

        const refund = await refundService.getRefund(id, userId);

        return reply.send(refundService.toResponse(refund));
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send(error.toJSON());
        }
        logger.error('Error getting refund', error);
        throw error;
      }
    }
  );
};

export default refundRoutes;
