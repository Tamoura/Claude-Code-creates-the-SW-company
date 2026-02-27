/**
 * Account Self-Service Routes — /v1/me
 *
 * Provides authenticated user self-service operations including:
 * - GDPR Article 15 "Right of Access" (GET /v1/me)
 * - GDPR Article 17 "Right to Erasure" (DELETE /v1/me)
 * - GDPR Article 20 "Right to Data Portability" (GET /v1/me/export)
 *
 * HIGH-02 remediation: implements DELETE /v1/me
 */

import { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const meRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/me — GDPR Right of Access (Article 15)
  //
  // Returns the authenticated user's own profile data. Never exposes
  // passwordHash or other internal fields.
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.currentUser!.id;

    const user = await fastify.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.code(200).send(user);
  });

  // GET /v1/me/export — GDPR Right to Data Portability (Article 20)
  //
  // Returns all data held about the authenticated user as a JSON export.
  // Sets Content-Disposition so browsers download the file directly.
  // Never includes sensitive fields: keyHash, passwordHash, secret.
  fastify.get('/export', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.currentUser!.id;

    const [user, paymentSessions, apiKeys, webhookEndpoints, paymentLinks] =
      await Promise.all([
        fastify.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        fastify.prisma.paymentSession.findMany({
          where: { userId },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            network: true,
            token: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.apiKey.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            lastUsedAt: true,
            createdAt: true,
            // keyHash intentionally excluded
          },
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.webhookEndpoint.findMany({
          where: { userId },
          select: {
            id: true,
            url: true,
            events: true,
            createdAt: true,
            // secret intentionally excluded
          },
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.paymentLink.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    logger.info('GDPR data export generated', { userId });

    reply.header(
      'Content-Disposition',
      'attachment; filename="stablecoin-gateway-data-export.json"'
    );
    reply.header('Content-Type', 'application/json');

    return reply.code(200).send({
      user,
      paymentSessions,
      apiKeys,
      webhookEndpoints,
      paymentLinks,
    });
  });

  // DELETE /v1/me — GDPR Right to Erasure (Article 17)
  //
  // Permanently deletes the authenticated user's account and all
  // associated data via Prisma cascade deletes (RefreshToken, PaymentSession,
  // ApiKey, WebhookEndpoint, PaymentLink, NotificationPreference).
  //
  // Note: AuditLog records are NOT user-scoped and persist after deletion
  // for compliance and non-repudiation purposes.
  fastify.delete('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.currentUser!.id;

    try {
      // Revoke all active refresh tokens before deletion so that any
      // tokens issued to the user before this point are immediately invalid.
      await fastify.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revokedAt: new Date(), revoked: true },
      });

      // Write audit log BEFORE deleting the user so the actor ID is
      // preserved. AuditLog rows survive user deletion by design.
      await fastify.prisma.auditLog.create({
        data: {
          actor: userId,
          action: 'account.deleted',
          resourceType: 'user',
          resourceId: userId,
          details: { reason: 'GDPR right to erasure (Article 17)' },
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      // Delete user — Prisma cascades to:
      //   RefreshToken, PaymentSession, ApiKey,
      //   WebhookEndpoint, PaymentLink, NotificationPreference
      await fastify.prisma.user.delete({
        where: { id: userId },
      });

      logger.info('User account deleted (GDPR erasure)', { userId });

      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      throw error;
    }
  });
};

export default meRoutes;
