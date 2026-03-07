/**
 * services/auth.service.ts — Authentication business logic
 *
 * Handles user registration, login, token management.
 * Pure business logic — no HTTP concerns.
 *
 * Security:
 * - Argon2id for password hashing (OWASP recommended)
 * - SHA-256 hash of refresh tokens (never store plaintext)
 * - Generic error messages to prevent user enumeration
 */

import { PrismaClient } from '@prisma/client';
import { hash as argon2Hash, verify as argon2Verify } from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { FastifyInstance } from 'fastify';
import { AppError } from '../utils/errors.js';

// Argon2id parameters (OWASP recommendations)
const ARGON2_OPTIONS = {
  type: 2 as const, // argon2id
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgId: string;
}

export interface LoginInput {
  email: string;
  password: string;
  orgId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    orgId: string;
  };
}

/**
 * Hash a plaintext refresh token to SHA-256 hex for DB storage.
 * Never store refresh tokens in plaintext.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically random refresh token.
 */
function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly app: FastifyInstance
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if email already exists in this org
    const existing = await this.prisma.user.findFirst({
      where: {
        orgId: input.orgId,
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new AppError('email-conflict', 409, 'Email already registered');
    }

    // Verify org exists
    const org = await this.prisma.organization.findUnique({
      where: { id: input.orgId },
    });
    if (!org) {
      throw new AppError('org-not-found', 400, 'Organization not found');
    }

    // Hash password with argon2id
    const passwordHash = await argon2Hash(input.password, ARGON2_OPTIONS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        orgId: input.orgId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        role: 'LEARNER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
      },
    });

    // Generate tokens
    const tokens = await this.createSession(user.id, user.orgId, user.role);

    return {
      ...tokens,
      user,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Generic error to prevent user enumeration
    const genericError = new AppError(
      'invalid-credentials',
      401,
      'Invalid email or password'
    );

    // Find user
    const user = await this.prisma.user.findFirst({
      where: {
        orgId: input.orgId,
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw genericError;
    }

    if (user.status === 'LOCKED') {
      throw new AppError('account-locked', 403, 'Account is locked');
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppError('account-deactivated', 403, 'Account has been deactivated');
    }

    // Verify password
    const isValid = await argon2Verify(user.passwordHash, input.password);
    if (!isValid) {
      throw genericError;
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.createSession(user.id, user.orgId, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = hashToken(refreshToken);

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            orgId: true,
            role: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError('invalid-refresh-token', 401, 'Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.prisma.userSession.delete({ where: { id: session.id } });
      throw new AppError('expired-refresh-token', 401, 'Refresh token expired');
    }

    if (session.user.deletedAt || session.user.status === 'LOCKED' || session.user.status === 'DEACTIVATED') {
      throw new AppError('unauthorized', 401, 'Account is not active');
    }

    // Update lastUsedAt
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    // Sign new access token
    const accessToken = this.app.jwt.sign(
      {
        sub: session.user.id,
        orgId: session.user.orgId,
        role: session.user.role,
      },
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);

    // Delete the session (if it exists)
    await this.prisma.userSession.deleteMany({
      where: { refreshTokenHash: tokenHash },
    });
  }

  private async createSession(
    userId: string,
    orgId: string,
    role: string
  ): Promise<AuthTokens> {
    // Generate access token (JWT)
    const accessToken = this.app.jwt.sign(
      { sub: userId, orgId, role },
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (random bytes)
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    // Store session with refresh token hash
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.userSession.create({
      data: {
        userId,
        orgId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
