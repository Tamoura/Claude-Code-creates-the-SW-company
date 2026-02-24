/**
 * Auth Service
 *
 * Core authentication: register, login, refresh, logout, profile.
 * Password reset and email verification in auth.recovery.ts.
 */

import { FastifyInstance } from 'fastify';
import { createHash, randomUUID, randomBytes } from 'crypto';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type { LoginResponse, RegisterResponse, UserProfile } from './auth.types.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_EXPIRY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  private async audit(
    action: string, userId: string | null,
    ip: string, userAgent: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.fastify.prisma.auditLog.create({
        data: {
          userId, resourceType: 'user', action, metadata,
          ipAddress: ip || null, userAgent: userAgent || null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log', err);
    }
  }

  async register(
    email: string, password: string, fullName: string,
    ip: string = '', userAgent: string = ''
  ): Promise<RegisterResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.fastify.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new AppError(409, 'conflict', 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = randomBytes(32).toString('hex');

    const user = await this.fastify.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName,
          status: 'registered',
          verificationToken: hashToken(verificationToken),
          verificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
        },
      });

      const slug = `personal-${newUser.id.slice(0, 8)}`;
      const workspace = await tx.workspace.create({
        data: {
          name: 'Personal Workspace',
          slug,
          ownerId: newUser.id,
          plan: 'free',
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: newUser.id,
          role: 'owner',
        },
      });

      return newUser;
    });

    logger.info('User registered', { userId: user.id, email: normalizedEmail });
    await this.audit('register', user.id, ip, userAgent, { email: normalizedEmail });

    return {
      message: 'Account created. Please check your email to verify.',
      userId: user.id,
    };
  }

  async login(
    email: string, password: string, ip: string, userAgent: string
  ): Promise<LoginResponse & { refreshToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.fastify.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(423, 'account-locked',
        `Account is locked. Try again in ${minutesLeft} minute(s).`);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await this.fastify.prisma.user.update({ where: { id: user.id }, data: updateData });
      await this.audit('login_failure', user.id, ip, userAgent, {
        email: normalizedEmail, attempts,
      });
      throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.fastify.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const jti = randomUUID();
    const accessToken = this.fastify.jwt.sign(
      { userId: user.id, role: user.role, jti },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '24h' }
    );
    const refreshToken = this.fastify.jwt.sign(
      { userId: user.id, type: 'refresh', jti: randomUUID() },
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    await this.fastify.prisma.session.create({
      data: {
        userId: user.id, tokenHash: hashToken(refreshToken), jti,
        ipAddress: ip || null, userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    await this.fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('User logged in', { userId: user.id });
    await this.audit('login_success', user.id, ip, userAgent, { email: normalizedEmail });

    return {
      accessToken, refreshToken,
      expiresAt: new Date(Date.now() + ACCESS_EXPIRY_MS).toISOString(),
      user: {
        id: user.id, email: user.email, fullName: user.fullName,
        role: user.role, status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async refresh(
    refreshToken: string, ip: string, userAgent: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
    if (!refreshToken) {
      throw new AppError(401, 'unauthorized', 'Missing refresh token');
    }

    const session = await this.fastify.prisma.session.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError(401, 'unauthorized', 'Invalid or expired refresh token');
    }

    const jti = randomUUID();
    const newAccessToken = this.fastify.jwt.sign(
      { userId: session.userId, role: session.user.role, jti },
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '24h' }
    );
    const newRefreshToken = this.fastify.jwt.sign(
      { userId: session.userId, type: 'refresh', jti: randomUUID() },
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    await this.fastify.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: hashToken(newRefreshToken), jti,
        ipAddress: ip || null, userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    return {
      accessToken: newAccessToken, refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + ACCESS_EXPIRY_MS).toISOString(),
    };
  }

  async logout(
    userId: string, accessJti: string, refreshToken?: string,
    ip: string = '', userAgent: string = ''
  ): Promise<void> {
    if (this.fastify.redis && accessJti) {
      await this.fastify.redis.set(`blacklist:${accessJti}`, '1', 'EX', 86400);
    }

    if (refreshToken) {
      await this.fastify.prisma.session.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    logger.info('User logged out', { userId });
    await this.audit('logout', userId, ip, userAgent);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.fastify.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'not-found', 'User not found');
    }

    return {
      id: user.id, email: user.email, fullName: user.fullName,
      role: user.role, status: user.status,
      emailVerified: user.emailVerified, avatarUrl: user.avatarUrl,
      totpEnabled: user.totpEnabled,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
