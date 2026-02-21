import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getConfig } from '../../config';
import {
  UnauthorizedError,
  BadRequestError,
} from '../../lib/errors';
import {
  AuthTokens,
  RegisterResponse,
  LoginResponse,
} from './auth.types';
import { RegisterInput, LoginInput } from './auth.schemas';

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
        userId: existing.id,
        email: existing.email,
        verificationToken: '',
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

    return {
      userId: user.id,
      email: user.email,
      verificationToken: rawVerificationToken,
      message:
        'Verification email sent. Please check your inbox.',
    };
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError(
        'Account is suspended. Contact support.'
      );
    }

    if (user.status === 'DEACTIVATED') {
      throw new UnauthorizedError(
        'Account is deactivated. Contact support to reactivate.'
      );
    }

    if (user.status === 'DELETED') {
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
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockout = attempts >= 5
        ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
        : {};
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, ...lockout },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role
    );

    await this.createSession(user.id, tokens.refreshToken);

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
        role: user.role,
        emailVerified: user.emailVerified,
        languagePreference: user.languagePreference,
      },
    };
  }

  async refresh(
    refreshToken: string
  ): Promise<{ accessToken: string }> {
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

    return { accessToken: tokens.accessToken };
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
    refreshToken: string
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),
      },
    });
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
        posts: { where: { isDeleted: false } },
        comments: { where: { isDeleted: false } },
        sentConnections: true,
        receivedConnections: true,
      },
    });

    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Strip internal fields
    const { passwordHash: _ph, verificationToken: _vt, resetToken: _rt, ...safeUser } = user;
    return {
      exportedAt: new Date().toISOString(),
      user: safeUser,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    // Soft delete: set status to DELETED and clear PII
    await this.prisma.user.update({
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
    });

    // Invalidate all sessions
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
