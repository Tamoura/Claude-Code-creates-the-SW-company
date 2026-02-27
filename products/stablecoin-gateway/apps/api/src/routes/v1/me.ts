/**
 * Account Self-Service Routes — /v1/me
 *
 * Provides authenticated user self-service operations including
 * GDPR Article 17 "Right to Erasure" (account deletion).
 *
 * HIGH-02 remediation: implements DELETE /v1/me
 */

import { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const meRoutes: FastifyPluginAsync = async (fastify) => {
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
