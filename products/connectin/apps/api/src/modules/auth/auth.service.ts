import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getConfig } from '../../config';
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
  ConflictError,
} from '../../lib/errors';
import {
  AuthTokens,
  RegisterResponse,
  LoginResponse,
  RefreshResponse,
} from './auth.types';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';
import { SecurityEventLogger } from '../../lib/security-events';

export class AuthService {
  private readonly secLog: SecurityEventLogger;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly app: FastifyInstance
  ) {
    this.secLog = new SecurityEventLogger(app.log);
  }

  async register(input: RegisterInput): Promise<RegisterResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      // Return same success shape to prevent user enumeration.
      // In production, also send a "someone tried to register" email.
      return {
        userId: crypto.randomUUID(),
        email: input.email.toLowerCase(),
        message:
          'Verification email sent. Please check your inbox.',
      };
    }

    const config = getConfig();
    const passwordHash = await bcrypt.hash(
      input.password,
      config.BCRYPT_ROUNDS
    );
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = this.hashToken(rawVerificationToken);
    const verificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
        verificationToken: verificationTokenHash,
        verificationExpires,
        profile: {
          create: {
            completenessScore: 0,
          },
        },
      },
    });

    this.secLog.log({
      event: 'auth.register',
      userId: user.id,
      email: user.email,
    });

    // Token should only be sent via email, never in API response
    return {
      userId: user.id,
      email: user.email,
      message:
        'Verification email sent. Please check your inbox.',
    };
  }

  async login(
    input: LoginInput,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      this.secLog.log({
        event: 'auth.login.failed',
        email: input.email,
        ip: meta?.ip,
        reason: 'user_not_found',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Unified error message for all non-active statuses to prevent enumeration
    if (user.status !== 'ACTIVE') {
      this.secLog.log({
        event: 'auth.login.failed',
        userId: user.id,
        ip: meta?.ip,
        reason: 'inactive_account',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      this.secLog.log({
        event: 'auth.login.locked',
        userId: user.id,
        ip: meta?.ip,
        reason: 'account_locked',
      });
      throw new UnauthorizedError(
        `Account is locked. Try again in ${minutesLeft} minute(s).`
      );
    }

    const isValid = await bcrypt.compare(
      input.password,
      user.passwordHash
    );
    if (!isValid) {
      // Atomic increment to prevent race condition on concurrent failed logins
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
        select: { failedLoginAttempts: true },
      });
      if (updated.failedLoginAttempts >= 5) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        this.secLog.log({
          event: 'auth.account.locked',
          userId: user.id,
          ip: meta?.ip,
          reason: 'max_failed_attempts',
        });
      }
      this.secLog.log({
        event: 'auth.login.failed',
        userId: user.id,
        ip: meta?.ip,
        reason: 'invalid_password',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role
    );

    await this.createSession(
      user.id,
      tokens.refreshToken,
      meta?.ip,
      meta?.userAgent
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    this.secLog.log({
      event: 'auth.login.success',
      userId: user.id,
      ip: meta?.ip,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role.toLowerCase(),
        emailVerified: user.emailVerified,
        languagePreference: user.languagePreference.toLowerCase(),
        status: user.status.toLowerCase(),
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async refresh(
    refreshToken: string
  ): Promise<RefreshResponse> {
    const tokenHash = this.hashToken(refreshToken);

    // Reject blacklisted (already-rotated) refresh tokens (RISK-008)
    const blacklisted = await this.app.redis.get(`refresh-blacklist:${tokenHash}`);
    if (blacklisted) {
      this.secLog.log({
        event: 'auth.token.replay',
        reason: 'blacklisted_refresh_token',
      });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(
      session.user.id,
      session.user.email,
      session.user.role
    );

    // Rotate refresh token — blacklist old token to prevent reuse (RISK-008)
    const newTokenHash = this.hashToken(tokens.refreshToken);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newTokenHash,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),
      },
    });
    // Blacklist old refresh token hash for 24h so it cannot be replayed
    await this.app.redis.set(
      `refresh-blacklist:${tokenHash}`,
      '1',
      { EX: 86400 }
    );

    this.secLog.log({
      event: 'auth.token.refresh',
      userId: session.user.id,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        role: session.user.role.toLowerCase(),
        emailVerified: session.user.emailVerified,
        languagePreference: session.user.languagePreference.toLowerCase(),
        status: session.user.status.toLowerCase(),
        createdAt: session.user.createdAt.toISOString(),
      },
    };
  }

  async logout(refreshToken: string, userId?: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session.deleteMany({
      where: { refreshTokenHash: tokenHash },
    });
    this.secLog.log({
      event: 'auth.logout',
      userId,
    });
  }

  async verifyEmail(
    token: string
  ): Promise<{ accessToken: string; message: string }> {
    const tokenHash = this.hashToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: tokenHash,
        verificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestError(
        'Invalid or expired verification token'
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role
    );

    await this.createSession(user.id, tokens.refreshToken);

    this.secLog.log({
      event: 'auth.email.verified',
      userId: user.id,
    });

    return {
      accessToken: tokens.accessToken,
      message: 'Email verified successfully',
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string
  ): Promise<AuthTokens> {
    const jti = crypto.randomUUID();
    const accessToken = this.app.jwt.sign({
      sub: userId,
      email,
      role,
      jti,
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: tokenHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),
      },
    });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    const successMessage =
      'If an account with that email exists, a password reset link has been sent.';

    if (!user) {
      return { message: successMessage };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpires: expires,
      },
    });

    this.secLog.log({
      event: 'auth.password.reset_requested',
      userId: user.id,
    });

    // In production, send the rawToken via email.
    // Token is NOT returned in the API response.
    return { message: successMessage };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = this.hashToken(input.token);

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const config = getConfig();
    const passwordHash = await bcrypt.hash(
      input.newPassword,
      config.BCRYPT_ROUNDS
    );

    await this.prisma.$transaction([
      // Update password and clear reset token
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpires: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Invalidate all sessions
      this.prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    this.secLog.log({
      event: 'auth.password.reset_completed',
      userId: user.id,
    });

    return { message: 'Password has been reset successfully.' };
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            experiences: true,
            profileSkills: { include: { skill: true } },
          },
        },
        posts: true,
        comments: true,
        likes: { include: { post: { select: { id: true, content: true } } } },
        sentConnections: {
          include: {
            receiver: { select: { id: true, displayName: true } },
          },
        },
        receivedConnections: {
          include: {
            sender: { select: { id: true, displayName: true } },
          },
        },
        sessions: {
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        consents: {
          select: {
            type: true,
            granted: true,
            version: true,
            grantedAt: true,
            revokedAt: true,
            createdAt: true,
          },
        },
        applications: {
          include: {
            job: { select: { id: true, title: true, company: true } },
          },
        },
        savedJobs: {
          include: {
            job: { select: { id: true, title: true, company: true } },
          },
        },
        sentMessages: {
          select: {
            id: true,
            content: true,
            conversationId: true,
            createdAt: true,
          },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
        },
        processingObjections: {
          select: {
            id: true,
            type: true,
            reason: true,
            objectedAt: true,
            withdrawnAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Strip internal/sensitive fields
    const {
      passwordHash: _ph,
      verificationToken: _vt,
      resetToken: _rt,
      resetTokenExpires: _rte,
      verificationExpires: _ve,
      ...safeUser
    } = user;
    return {
      exportedAt: new Date().toISOString(),
      retentionPolicy: {
        sessions: '30 days from last activity (auto-cleaned hourly)',
        notifications: '90 days (auto-cleaned)',
        account: 'Until user-initiated deletion (GDPR Art. 17)',
        posts: 'Until user-initiated deletion',
        messages: 'Until user-initiated deletion',
        consents: 'Retained for audit trail per regulatory requirement',
      },
      user: safeUser,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction([
      // Delete likes by this user
      this.prisma.like.deleteMany({
        where: { userId },
      }),
      // Soft-delete comments by this user
      this.prisma.comment.updateMany({
        where: { authorId: userId },
        data: { isDeleted: true, content: '[deleted]' },
      }),
      // Soft-delete posts by this user
      this.prisma.post.updateMany({
        where: { authorId: userId },
        data: { isDeleted: true, content: '[deleted]' },
      }),
      // Delete connections (both sent and received)
      this.prisma.connection.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      }),
      // Delete profile skills
      this.prisma.profileSkill.deleteMany({
        where: { profile: { userId } },
      }),
      // Delete experiences
      this.prisma.experience.deleteMany({
        where: { profile: { userId } },
      }),
      // Delete profile
      this.prisma.profile.deleteMany({
        where: { userId },
      }),
      // Delete consents
      this.prisma.consent.deleteMany({
        where: { userId },
      }),
      // Invalidate all sessions
      this.prisma.session.deleteMany({
        where: { userId },
      }),
      // Soft delete user: set status to DELETED and clear PII
      this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'DELETED',
          email: `deleted-${userId}@deleted.connectin`,
          displayName: 'Deleted User',
          passwordHash: null,
          verificationToken: null,
          verificationExpires: null,
          resetToken: null,
          resetTokenExpires: null,
        },
      }),
    ]);

    this.secLog.log({
      event: 'auth.account.deleted',
      userId,
    });
  }

  async restrictProcessing(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestError('User not found');
    if (user.processingRestricted) {
      throw new ConflictError('Processing is already restricted');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { processingRestricted: true, processingRestrictedAt: now },
    });

    this.secLog.log({ event: 'auth.gdpr.processing_restricted', userId });
    return { restricted: true, timestamp: now.toISOString() };
  }

  async liftRestriction(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestError('User not found');
    if (!user.processingRestricted) {
      throw new ConflictError('Processing is not currently restricted');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { processingRestricted: false, processingRestrictedAt: null },
    });

    this.secLog.log({ event: 'auth.gdpr.processing_restriction_lifted', userId });
    return { restricted: false, timestamp: null };
  }

  async registerObjection(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestError('User not found');
    if (user.objectionRegistered) {
      throw new ConflictError('Objection is already registered');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { objectionRegistered: true, objectionRegisteredAt: now },
    });

    this.secLog.log({ event: 'auth.gdpr.objection_registered', userId });
    return { objection: true, timestamp: now.toISOString() };
  }

  async withdrawObjection(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestError('User not found');
    if (!user.objectionRegistered) {
      throw new ConflictError('No objection is currently registered');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { objectionRegistered: false, objectionRegisteredAt: null },
    });

    this.secLog.log({ event: 'auth.gdpr.objection_withdrawn', userId });
    return { objection: false, timestamp: null };
  }

  async listSessions(
    userId: string,
    _currentJti?: string
  ) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      current: false,
    }));
  }

  async revokeSession(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found');
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  // ─── GDPR Art 18: Right to Restrict Processing ─────────────

  async restrictProcessing(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isRestricted: true,
        restrictedAt: new Date(),
      },
    });

    this.secLog.log({
      event: 'gdpr.processing.restricted',
      userId,
    });
  }

  async liftRestriction(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isRestricted: false,
        restrictedAt: null,
      },
    });

    this.secLog.log({
      event: 'gdpr.processing.restriction_lifted',
      userId,
    });
  }

  // ─── GDPR Art 21: Right to Object ─────────────────────────

  async registerObjection(
    userId: string,
    type: string,
    reason?: string,
    meta?: { ip?: string; userAgent?: string }
  ) {
    const objection = await this.prisma.processingObjection.upsert({
      where: {
        userId_type: {
          userId,
          type: type as any,
        },
      },
      update: {
        reason: reason ?? null,
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        objectedAt: new Date(),
        withdrawnAt: null,
      },
      create: {
        userId,
        type: type as any,
        reason: reason ?? null,
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    this.secLog.log({
      event: 'gdpr.objection.registered',
      userId,
      objectionType: type,
    });

    return objection;
  }

  async withdrawObjection(
    userId: string,
    type: string
  ): Promise<void> {
    const objection = await this.prisma.processingObjection.findUnique({
      where: {
        userId_type: {
          userId,
          type: type as any,
        },
      },
    });

    if (!objection || objection.withdrawnAt) {
      throw new NotFoundError('Objection not found');
    }

    await this.prisma.processingObjection.update({
      where: { id: objection.id },
      data: { withdrawnAt: new Date() },
    });

    this.secLog.log({
      event: 'gdpr.objection.withdrawn',
      userId,
      objectionType: type,
    });
  }

  async listObjections(userId: string) {
    return this.prisma.processingObjection.findMany({
      where: {
        userId,
        withdrawnAt: null,
      },
      select: {
        id: true,
        type: true,
        reason: true,
        objectedAt: true,
      },
      orderBy: { objectedAt: 'desc' },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
