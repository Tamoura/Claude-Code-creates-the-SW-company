import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getConfig } from '../../config';
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
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

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly app: FastifyInstance
  ) {}

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
      throw new UnauthorizedError('Invalid email or password');
    }

    // Unified error message for all non-active statuses to prevent enumeration
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
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
      }
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

    // Rotate refresh token
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

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session.deleteMany({
      where: { refreshTokenHash: tokenHash },
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

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
