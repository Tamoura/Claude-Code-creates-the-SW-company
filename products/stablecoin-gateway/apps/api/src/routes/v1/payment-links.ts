import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { ZodError, z } from 'zod';
import { PaymentLinkService } from '../../services/payment-link.service.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { validateBody, validateQuery, ethereumAddressSchema } from '../../utils/validation.js';
import QRCode from 'qrcode';

// ==================== Validation Schemas ====================

// Metadata validation with size limits (same as payment sessions)
const metadataValueSchema = z.union([
  z.string().max(500, 'Metadata string values must be <= 500 characters'),
  z.number(),
  z.boolean(),
  z.null(),
]);

const metadataSchema = z
  .record(metadataValueSchema)
  .optional()
  .refine(
    (data) => {
      if (!data) return true;
      const keys = Object.keys(data);
      return keys.length <= 50;
    },
    { message: 'Metadata cannot have more than 50 keys' }
  )
  .refine(
    (data) => {
      if (!data) return true;
      const jsonSize = JSON.stringify(data).length;
      return jsonSize <= 16384; // 16KB
    },
    { message: 'Metadata size cannot exceed 16KB' }
  );

const createPaymentLinkSchema = z.object({
  name: z.string().max(200).optional(),
  amount: z
    .number()
    .min(1, 'Amount must be at least 1 USD')
    .max(10000, 'Amount cannot exceed 10,000 USD')
    .optional()
    .nullable(), // null means customer chooses amount
  currency: z.enum(['USD']).default('USD'),
  network: z.enum(['polygon', 'ethereum']).default('polygon'),
  token: z.enum(['USDC', 'USDT']).default('USDC'),
  merchant_address: ethereumAddressSchema,
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  metadata: metadataSchema,
  max_usages: z.number().int().positive().optional().nullable(), // null = unlimited
  expires_at: z.string().datetime().optional(),
});

const updatePaymentLinkSchema = z.object({
  name: z.string().max(200).optional(),
  active: z.boolean().optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  metadata: metadataSchema,
  max_usages: z.number().int().positive().optional().nullable(),
  expires_at: z.string().datetime().optional(),
});

const listPaymentLinksQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  active: z.coerce.boolean().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
});

// ==================== Routes ====================

const paymentLinkRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limit config for public endpoints (RISK-032 fix)
  const publicRateLimit = {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (request: FastifyRequest) => `paylink:${request.ip}`,
      },
    },
  };

  const qrRateLimit = {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (request: FastifyRequest) => `qr:${request.ip}`,
      },
    },
  };

  // POST /v1/payment-links - Create payment link
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('write')],
    },
    async (request, reply) => {
      try {
        const body = validateBody(createPaymentLinkSchema, request.body);
        const userId = request.currentUser!.id;

        const paymentLinkService = new PaymentLinkService(fastify.prisma);

        const link = await paymentLinkService.createPaymentLink(userId, {
          name: body.name,
          amount: body.amount,
          currency: body.currency,
          network: body.network,
          token: body.token,
          merchant_address: body.merchant_address,
          success_url: body.success_url,
          cancel_url: body.cancel_url,
          description: body.description,
          metadata: body.metadata,
          max_usages: body.max_usages,
          expires_at: body.expires_at ? new Date(body.expires_at) : undefined,
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
        const response = paymentLinkService.toResponse(link, baseUrl);

        logger.info('Payment link created', {
          userId,
          paymentLinkId: link.id,
          shortCode: link.shortCode,
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
        logger.error('Error creating payment link', error);
        throw error;
      }
    }
  );

  // GET /v1/payment-links - List payment links
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('read')],
    },
    async (request, reply) => {
      try {
        const query = validateQuery(listPaymentLinksQuerySchema, request.query);
        const userId = request.currentUser!.id;

        const paymentLinkService = new PaymentLinkService(fastify.prisma);
        const { data, total } = await paymentLinkService.listPaymentLinks(userId, {
          limit: query.limit,
          offset: query.offset,
          active: query.active,
          created_after: query.created_after ? new Date(query.created_after) : undefined,
          created_before: query.created_before ? new Date(query.created_before) : undefined,
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
        const links = data.map((link) => paymentLinkService.toResponse(link, baseUrl));

        return reply.send({
          data: links,
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
        logger.error('Error listing payment links', error);
        throw error;
      }
    }
  );

  // GET /v1/payment-links/resolve/:shortCode - Resolve short code (public)
  // Registered before /:id to prevent Fastify from matching "resolve" as an :id param
  fastify.get('/resolve/:shortCode', publicRateLimit, async (request, reply) => {
    try {
      const { shortCode } = request.params as { shortCode: string };

      const paymentLinkService = new PaymentLinkService(fastify.prisma);
      const link = await paymentLinkService.getPaymentLinkByShortCode(shortCode);

      // Validate link is still usable (RISK-040 fix)
      if (!link.active) {
        throw new AppError(400, 'link-inactive', 'This payment link is no longer active');
      }

      if (link.expiresAt && link.expiresAt < new Date()) {
        throw new AppError(400, 'link-expired', 'This payment link has expired');
      }

      if (link.maxUsages !== null && link.usageCount >= link.maxUsages) {
        throw new AppError(400, 'link-max-usage-reached', 'Payment link has reached maximum usage limit');
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const response = paymentLinkService.toResponse(link, baseUrl);

      return reply.send(response);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error resolving payment link', error);
      throw error;
    }
  });

  // GET /v1/payment-links/:id/qr - Generate QR code (public)
  // Registered before /:id to prevent Fastify from matching QR path segments incorrectly
  fastify.get('/:id/qr', qrRateLimit, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // First, try to find by ID (for authenticated merchants)
      let link = await fastify.prisma.paymentLink.findUnique({
        where: { id },
      });

      // If not found by ID, try as a short code (for public access)
      if (!link) {
        link = await fastify.prisma.paymentLink.findUnique({
          where: { shortCode: id },
        });
      }

      if (!link) {
        throw new AppError(404, 'not-found', 'Payment link not found');
      }

      // Validate link is still usable
      if (!link.active) {
        throw new AppError(400, 'link-inactive', 'Payment link is no longer active');
      }

      if (link.expiresAt && link.expiresAt < new Date()) {
        throw new AppError(400, 'link-expired', 'Payment link has expired');
      }

      if (link.maxUsages !== null && link.usageCount >= link.maxUsages) {
        throw new AppError(
          400,
          'link-max-usage-reached',
          'Payment link has reached maximum usage limit'
        );
      }

      // Generate checkout URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
      const checkoutUrl = `${baseUrl}/pay/${link.shortCode}`;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(checkoutUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      logger.info('QR code generated for payment link', {
        paymentLinkId: link.id,
        shortCode: link.shortCode,
      });

      return reply.send({
        qr_code: qrDataUrl,
        payment_url: checkoutUrl,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      logger.error('Error generating QR code', error);
      throw error;
    }
  });

  // GET /v1/payment-links/:id - Get payment link by ID
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('read')],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.currentUser!.id;

        const paymentLinkService = new PaymentLinkService(fastify.prisma);
        const link = await paymentLinkService.getPaymentLink(id, userId);

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
        const response = paymentLinkService.toResponse(link, baseUrl);

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
        logger.error('Error getting payment link', error);
        throw error;
      }
    }
  );

  // PATCH /v1/payment-links/:id - Update payment link
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('write')],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.currentUser!.id;
        const updates = validateBody(updatePaymentLinkSchema, request.body);

        const paymentLinkService = new PaymentLinkService(fastify.prisma);
        const link = await paymentLinkService.updatePaymentLink(id, userId, {
          name: updates.name,
          active: updates.active,
          success_url: updates.success_url,
          cancel_url: updates.cancel_url,
          description: updates.description,
          metadata: updates.metadata,
          max_usages: updates.max_usages,
          expires_at: updates.expires_at ? new Date(updates.expires_at) : undefined,
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
        const response = paymentLinkService.toResponse(link, baseUrl);

        logger.info('Payment link updated', {
          userId,
          paymentLinkId: id,
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
        logger.error('Error updating payment link', error);
        throw error;
      }
    }
  );

  // DELETE /v1/payment-links/:id - Deactivate payment link
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate, fastify.requirePermission('write')],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.currentUser!.id;

        const paymentLinkService = new PaymentLinkService(fastify.prisma);
        const link = await paymentLinkService.deactivatePaymentLink(id, userId);

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
        const response = paymentLinkService.toResponse(link, baseUrl);

        logger.info('Payment link deactivated', {
          userId,
          paymentLinkId: id,
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
        logger.error('Error deactivating payment link', error);
        throw error;
      }
    }
  );

};

export default paymentLinkRoutes;
