/**
 * Auth Recovery Service
 *
 * Handles password reset and email verification flows.
 * Split from AuthService to keep files under 300 lines.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { hashPassword } from '../../utils/crypto.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthRecoveryService {
  constructor(private fastify: FastifyInstance) {}

  private async audit(
    action: string, userId: string | null,
    ip: string, userAgent: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.fastify.prisma.auditLog.create({
        data: {
          userId, resourceType: 'user', action, metadata: metadata as Prisma.InputJsonValue,
          ipAddress: ip || null, userAgent: userAgent || null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log', err);
    }
  }

  async forgotPassword(email: string, ip: string = '', userAgent: string = ''): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.fastify.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) return;

    const resetToken = randomBytes(32).toString('hex');
    await this.fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(resetToken),
        resetTokenExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    logger.info('Password reset requested', { userId: user.id });
    await this.audit('forgot_password', user.id, ip, userAgent, { email: normalizedEmail });
  }

  async resetPassword(
    token: string, newPassword: string,
    ip: string = '', userAgent: string = ''
  ): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await this.fastify.prisma.user.findFirst({
      where: { resetToken: tokenHash },
    });

    if (!user) {
      throw new AppError(400, 'bad-request', 'Invalid or expired reset token');
    }
    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new AppError(400, 'bad-request', 'Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash, resetToken: null, resetTokenExpires: null,
        failedLoginAttempts: 0, lockedUntil: null,
      },
    });

    await this.fastify.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logger.info('Password reset completed', { userId: user.id });
    await this.audit('reset_password', user.id, ip, userAgent);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await this.fastify.prisma.user.findFirst({
      where: { verificationToken: tokenHash },
    });

    if (!user) {
      throw new AppError(400, 'bad-request', 'Invalid or expired verification token');
    }
    if (!user.verificationExpires || user.verificationExpires < new Date()) {
      throw new AppError(400, 'bad-request', 'Invalid or expired verification token');
    }
    if (user.emailVerified) {
      throw new AppError(400, 'bad-request', 'Email already verified');
    }

    await this.fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true, status: 'active',
        verificationToken: null, verificationExpires: null,
      },
    });

    logger.info('Email verified', { userId: user.id });
  }
}
