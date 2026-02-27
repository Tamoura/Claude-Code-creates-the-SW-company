import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma, PaymentStatus } from '@prisma/client';
import { createPaymentSessionSchema, listPaymentSessionsQuerySchema, updatePaymentSessionSchema, idempotencyKeySchema, validateBody, validateQuery } from '../../utils/validation.js';
import { PaymentService } from '../../services/payment.service.js';
import { BlockchainMonitorService } from '../../services/blockchain-monitor.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { validatePaymentStatusTransition } from '../../utils/payment-state-machine.js';

// SSE connection tracking for rate limiting (Phase 3.7)
// ARC-03: These are in-process counters. In a single-instance deployment they
// work correctly. In multi-instance deployments each process has its own
// counters, so a user can open SSE_MAX_PER_USER connections to EACH instance.
// For Redis-backed counters across instances, set SSE_USE_REDIS_COUNTERS=true
// and ensure fastify.redis is configured. The in-process counters remain as
// a fallback when Redis is unavailable.
const sseConnectionsByUser = new Map<string, number>();
let sseGlobalConnections = 0;
const SSE_MAX_PER_USER = 10;
const SSE_MAX_GLOBAL = parseInt(process.env.SSE_MAX_CONNECTIONS || '100', 10);
// TODO(ARC-03): When migrating SSE to multi-instance deployment, replace the
// in-memory connection counter below with a Redis-backed counter.
// Env var SSE_USE_REDIS_COUNTERS is reserved for future use.
// See: products/stablecoin-gateway/docs/AUDIT-REPORT.md — ARC-03

const paymentSessionRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/payment-sessions
  fastify.post('/', {
    onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  }, async (request, reply) => {
    try {
      const body = validateBody(createPaymentSessionSchema, request.body);
      const userId = request.currentUser!.id;

      const paymentService = new PaymentService(fastify.prisma);

      // IDEMPOTENCY: Check if payment already exists with this idempotency key
      // Read from Idempotency-Key header per API contract (not body)
      // Scoped to userId to prevent cross-tenant conflicts
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

      // SECURITY (SEC-015): Validate idempotency key format to prevent
      // database bloat and potential injection via column truncation
      if (idempotencyKey !== undefined) {
        const result = idempotencyKeySchema.safeParse(idempotencyKey);
        if (!result.success) {
          return reply.code(400).send({
            type: 'https://gateway.io/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: result.error.issues[0].message,
          });
        }
      }

      if (idempotencyKey) {
        const existingSession = await fastify.prisma.paymentSession.findUnique({
          where: {
            userId_idempotencyKey: {
              userId,
              idempotencyKey,
            },
          },
        });

        if (existingSession) {
          // SECURITY (Audit #10): Verify request parameters match the original
          // to prevent silent parameter manipulation via idempotency key reuse
          const paramsMismatch =
            Number(existingSession.amount) !== body.amount ||
            existingSession.currency !== (body.currency || 'USD') ||
            existingSession.network !== (body.network || 'polygon') ||
            existingSession.token !== (body.token || 'USDC') ||
            existingSession.merchantAddress !== body.merchant_address;

          if (paramsMismatch) {
            return reply.code(409).send({
              type: 'https://gateway.io/errors/idempotency-params-mismatch',
              title: 'Idempotency Params Mismatch',
              status: 409,
              detail: 'Idempotency key already used with different parameters',
            });
          }

          // Return existing payment session (idempotent behavior)
          const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
          const response = paymentService.toResponse(existingSession, baseUrl);

          logger.info('Payment session returned (idempotent)', {
            userId,
            paymentSessionId: existingSession.id,
            idempotencyKey,
          });

          // Return 200 (not 201) to indicate this is an existing resource
          return reply.code(200).send(response);
        }
      }

      const session = await paymentService.createPaymentSession(userId, body, idempotencyKey);

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const response = paymentService.toResponse(session, baseUrl);

      logger.info('Payment session created', {
        userId,
        paymentSessionId: session.id,
        amount: session.amount,
        idempotencyKey,
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

      // Build update data with only allowed fields (security: whitelist prevents mass assignment)
      const updateData: Prisma.PaymentSessionUpdateInput = {};

      // CRITICAL: Wrap entire operation in transaction to prevent race conditions
      // Without this, concurrent requests could:
      // - Double-complete payments
      // - Overwrite blockchain verification data
      // - Create status conflicts (one marks FAILED, another COMPLETED)
      const updatedSession = await fastify.prisma.$transaction(async (tx) => {
        // Get existing session with FOR UPDATE lock (prevents concurrent modifications)
        // Prisma doesn't support FOR UPDATE natively, so use raw SQL
        const existingSessionRows = await tx.$queryRaw<Array<{
          id: string;
          user_id: string;
          status: string;
          amount: any;
          currency: string;
          description: string | null;
          network: string;
          token: string;
          merchant_address: string;
          customer_address: string | null;
          tx_hash: string | null;
          block_number: number | null;
          confirmations: number;
          success_url: string | null;
          cancel_url: string | null;
          metadata: any;
          idempotency_key: string | null;
          created_at: Date;
          expires_at: Date;
          completed_at: Date | null;
        }>>`
          SELECT * FROM payment_sessions
          WHERE id = ${id} AND user_id = ${userId}
          FOR UPDATE
        `;

        if (existingSessionRows.length === 0) {
          throw new AppError(404, 'payment-not-found', 'Payment session not found');
        }

        const row = existingSessionRows[0];

        // Map snake_case to camelCase for compatibility with rest of code
        const existingSession = {
          id: row.id,
          userId: row.user_id,
          status: row.status,
          amount: row.amount,
          currency: row.currency,
          description: row.description,
          network: row.network,
          token: row.token,
          merchantAddress: row.merchant_address,
          customerAddress: row.customer_address,
          txHash: row.tx_hash,
          blockNumber: row.block_number,
          confirmations: row.confirmations,
          successUrl: row.success_url,
          cancelUrl: row.cancel_url,
          metadata: row.metadata,
          idempotencyKey: row.idempotency_key,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          completedAt: row.completed_at,
        };

        // SECURITY: Enforce payment session expiry
        // Expired sessions cannot advance to CONFIRMING or COMPLETED.
        // They are auto-set to FAILED and the request is rejected.
        // Transitions to FAILED (or non-status updates) are still allowed.
        const isExpired = existingSession.expiresAt &&
          new Date(existingSession.expiresAt) < new Date();
        const isAdvancingStatus = updates.status === 'CONFIRMING' ||
          updates.status === 'COMPLETED';

        if (isExpired && isAdvancingStatus) {
          // Set to FAILED via sentinel return so the transaction commits
          // before we throw an error (prevents rollback of FAILED status)
          const failedSession = await tx.paymentSession.update({
            where: { id },
            data: { status: 'FAILED' },
          });
          return { __expired: true, session: failedSession };
        }

        // SECURITY: Validate status transitions using state machine
        // Prevents unauthorized or invalid state changes (e.g., PENDING → COMPLETED without CONFIRMING)
        if (updates.status && updates.status !== existingSession.status) {
          validatePaymentStatusTransition(
            existingSession.status as PaymentStatus,
            updates.status as PaymentStatus
          );
        }

      // SECURITY: If status is being updated to CONFIRMING or COMPLETED, verify on blockchain
      // This prevents payment fraud by ensuring transactions are real and match expected parameters
      if (updates.status === 'CONFIRMING' || updates.status === 'COMPLETED') {
        // Require tx_hash when changing to CONFIRMING or COMPLETED
        const txHash = updates.tx_hash || existingSession.txHash;
        if (!txHash) {
          throw new AppError(400, 'missing-tx-hash', 'Transaction hash required when changing status to CONFIRMING or COMPLETED');
        }

        // Verify transaction on blockchain
        const blockchainService = new BlockchainMonitorService();
        const verification = await blockchainService.verifyPaymentTransaction(
          {
            id: existingSession.id,
            network: existingSession.network as 'polygon' | 'ethereum',
            token: existingSession.token as 'USDC' | 'USDT',
            amount: Number(existingSession.amount),
            merchantAddress: existingSession.merchantAddress,
          },
          txHash,
          updates.status === 'COMPLETED' ? 12 : 1 // Require 12 confirmations for COMPLETED, 1 for CONFIRMING
        );

        if (!verification.valid) {
          logger.warn('Blockchain verification failed', {
            paymentSessionId: id,
            txHash,
            error: verification.error,
          });
          throw new AppError(400, 'invalid-transaction', verification.error || 'Transaction verification failed');
        }

        logger.info('Blockchain verification succeeded', {
          paymentSessionId: id,
          txHash,
          confirmations: verification.confirmations,
        });

        // Add verified data to updates (replaces any user-submitted values with verified on-chain data)
        if (updates.tx_hash) {
          updateData.txHash = updates.tx_hash;
        }
        updateData.blockNumber = verification.blockNumber;
        updateData.confirmations = verification.confirmations;
        updateData.customerAddress = verification.sender;
        updateData.status = updates.status;

        // Auto-set completedAt when status changes to COMPLETED
        if (updates.status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
      } else {
        // SECURITY (Audit #1): Reject blockchain field updates without a
        // status transition to CONFIRMING or COMPLETED. These fields must
        // only be set via blockchain verification, never by the client.
        const hasBlockchainFields =
          updates.tx_hash !== undefined ||
          updates.block_number !== undefined ||
          updates.confirmations !== undefined;

        if (hasBlockchainFields) {
          throw new AppError(
            400,
            'blockchain-fields-require-status-transition',
            'Cannot update blockchain fields (tx_hash, block_number, confirmations) without a status transition to CONFIRMING or COMPLETED'
          );
        }

        // Non-blockchain field updates
        if (updates.customer_address !== undefined) {
          updateData.customerAddress = updates.customer_address;
        }

        if (updates.status !== undefined) {
          updateData.status = updates.status;
        }
      }

        // Update payment session within transaction
        return await tx.paymentSession.update({
          where: { id },
          data: updateData,
        });
      }); // End of transaction

      // Check if the session was detected as expired during the transaction.
      // The FAILED status update is committed, now throw the error.
      if (updatedSession && typeof updatedSession === 'object' && '__expired' in updatedSession) {
        throw new AppError(
          400,
          'session-expired',
          'Payment session has expired'
        );
      }

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
  fastify.get('/:id/events', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request: FastifyRequest) => {
          // Rate limit by auth token subject (userId from SSE token)
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const token = authHeader.substring(7);
              const decoded = fastify.jwt.verify(token) as { userId: string };
              return `sse:${decoded.userId}`;
            } catch {
              return `sse:${request.ip}`;
            }
          }
          return `sse:${request.ip}`;
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // SECURITY: Only accept Authorization header (no query tokens - they leak in logs/history)
      // Require short-lived SSE tokens (type='sse'), not regular access tokens
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.raw.writeHead(401, { 'Content-Type': 'text/plain' });
        reply.raw.end('Unauthorized: Missing or invalid authentication token');
        return;
      }

      const token = authHeader.substring(7);
      let decoded: { userId: string; type?: string; paymentSessionId?: string };
      try {
        decoded = fastify.jwt.verify(token) as { userId: string; type?: string; paymentSessionId?: string };
      } catch (error) {
        reply.raw.writeHead(401, { 'Content-Type': 'text/plain' });
        reply.raw.end('Unauthorized: Invalid or expired token');
        return;
      }

      // Verify this is an SSE token (not a regular access token)
      if (decoded.type !== 'sse') {
        reply.raw.writeHead(403, { 'Content-Type': 'text/plain' });
        reply.raw.end('Access denied: This endpoint requires an SSE-scoped token');
        return;
      }

      // Verify token is scoped to this payment session
      if (decoded.paymentSessionId !== id) {
        reply.raw.writeHead(403, { 'Content-Type': 'text/plain' });
        reply.raw.end('Access denied');
        return;
      }

      const userId = decoded.userId;

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

      // Enforce SSE connection limits (Phase 3.7)
      const currentUserConnections = sseConnectionsByUser.get(userId) || 0;
      if (currentUserConnections >= SSE_MAX_PER_USER) {
        reply.raw.writeHead(429, { 'Content-Type': 'text/plain' });
        reply.raw.end('Too many SSE connections');
        return;
      }
      if (sseGlobalConnections >= SSE_MAX_GLOBAL) {
        reply.raw.writeHead(429, { 'Content-Type': 'text/plain' });
        reply.raw.end('Service at capacity');
        return;
      }

      // Track connection
      sseConnectionsByUser.set(userId, currentUserConnections + 1);
      sseGlobalConnections++;

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

      // Guard against calling reply.raw.end() multiple times.
      // The close handler, heartbeat expiry, and max timeout can
      // all trigger independently; only the first should end().
      let connectionClosed = false;
      const closeConnection = () => {
        if (connectionClosed) return;
        connectionClosed = true;
        clearInterval(heartbeat);
        clearTimeout(maxConnectionTimeout);
        // Decrement connection tracking (Phase 3.7)
        const count = sseConnectionsByUser.get(userId) || 1;
        if (count <= 1) {
          sseConnectionsByUser.delete(userId);
        } else {
          sseConnectionsByUser.set(userId, count - 1);
        }
        sseGlobalConnections = Math.max(0, sseGlobalConnections - 1);
        reply.raw.end();
      };

      // SECURITY: Re-validate token on each heartbeat to detect expiry.
      // Without this, an attacker could start an SSE connection and
      // maintain access indefinitely after the JWT expires.
      const heartbeat = setInterval(() => {
        if (connectionClosed) return;
        try {
          fastify.jwt.verify(token);
        } catch {
          // Token expired or invalid -- close the connection
          reply.raw.write('event: error\ndata: {"message":"Token expired"}\n\n');
          closeConnection();
          return;
        }
        reply.raw.write(': heartbeat\n\n');
      }, 30000);

      // SECURITY: Enforce a maximum connection duration (30 minutes).
      // Prevents indefinite resource consumption even with valid tokens.
      const maxConnectionTimeout = setTimeout(() => {
        if (connectionClosed) return;
        reply.raw.write('event: close\ndata: {"message":"Maximum connection time reached"}\n\n');
        closeConnection();
      }, 30 * 60 * 1000);

      // Clean up all timers on client disconnect
      request.raw.on('close', () => {
        closeConnection();
      });
    } catch (error) {
      logger.error('Error in SSE stream', error);
      reply.raw.writeHead(500, { 'Content-Type': 'text/plain' });
      reply.raw.end('Internal server error');
    }
  });
};

export default paymentSessionRoutes;
