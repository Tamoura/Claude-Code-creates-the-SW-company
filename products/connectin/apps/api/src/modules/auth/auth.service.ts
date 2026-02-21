import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getConfig } from '../../config';
import {
  ConflictError,
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
      throw new ConflictError('Email already registered');
    }

    const config = getConfig();
    const passwordHash = await bcrypt.hash(
      input.password,
      config.BCRYPT_ROUNDS
    );
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
        verificationToken,
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

    const isValid = await bcrypt.compare(
      input.password,
      user.passwordHash
    );
    if (!isValid) {
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
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: tokens.accessToken,
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
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
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

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
