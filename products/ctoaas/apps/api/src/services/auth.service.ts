import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../lib/errors';
import { SignupInput } from '../validations/auth.validation';

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new user, organization, and company profile in a single
   * transaction. Returns the user without password_hash.
   */
  async signup(data: SignupInput): Promise<{ user: SafeUser }> {
    const email = data.email.trim().toLowerCase();
    const name = stripHtml(data.name);
    const companyName = stripHtml(data.companyName);

    // Check for duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw AppError.conflict(
        'An account with this email already exists'
      );
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      BCRYPT_ROUNDS
    );
    const verificationToken = crypto.randomUUID();
    const verificationTokenExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: companyName,
          industry: 'Technology',
          employeeCount: 0,
          growthStage: 'SEED',
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email,
          name,
          passwordHash,
          role: 'CTO',
          emailVerified: false,
          verificationToken,
          verificationTokenExpiresAt,
        },
      });

      await tx.companyProfile.create({
        data: {
          organizationId: org.id,
        },
      });

      return user;
    });

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
    };
  }

  /**
   * Authenticate a user by email and password.
   * Returns the user (safe fields) on success; throws 401 on failure.
   * Uses a constant-time error message to prevent user enumeration.
   */
  async login(
    email: string,
    password: string
  ): Promise<SafeUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const genericError = 'Invalid email or password';

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Run a dummy bcrypt compare to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalid.hash.placeholder.padding');
      throw AppError.unauthorized(genericError);
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw AppError.unauthorized(
        'Account is temporarily locked. Please try again later.'
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      // Increment failed login attempts
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = {
        failedLoginAttempts: attempts,
      };
      // Lock after 5 failed attempts for 15 minutes
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(
          Date.now() + 15 * 60 * 1000
        );
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw AppError.unauthorized(genericError);
    }

    // Reset failed login attempts on success
    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Create a refresh token record in the database.
   */
  async createRefreshToken(
    userId: string,
    jti: string,
    expiresAt: Date
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        jti,
        expiresAt,
      },
    });
  }

  /**
   * Verify a user's email address using their verification token.
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw AppError.badRequest(
        'Invalid or expired verification token'
      );
    }

    if (
      user.verificationTokenExpiresAt &&
      user.verificationTokenExpiresAt < new Date()
    ) {
      throw AppError.badRequest(
        'Verification token has expired'
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });
  }

  /**
   * Rotate a refresh token: validate the old JTI, revoke it,
   * create a new refresh token, and return the user for JWT signing.
   */
  async refreshToken(
    jti: string
  ): Promise<{ user: SafeUser; newJti: string }> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { jti },
      include: { user: true },
    });

    if (!token || token.revoked || token.expiresAt < new Date()) {
      throw AppError.unauthorized(
        'Invalid or expired refresh token'
      );
    }

    // Revoke the old token
    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revoked: true },
    });

    // Create a new refresh token
    const newJti = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: token.userId,
        jti: newJti,
        expiresAt,
      },
    });

    return {
      user: {
        id: token.user.id,
        email: token.user.email,
        name: token.user.name,
        role: token.user.role,
      },
      newJti,
    };
  }

  /**
   * Logout: revoke the refresh token and blacklist the access
   * token JTI in Redis.
   */
  async logout(
    jti: string | undefined,
    revokeRefreshJti: string | undefined,
    redis: {
      set(
        key: string,
        value: string,
        options?: { EX?: number }
      ): Promise<void>;
    }
  ): Promise<void> {
    // Revoke refresh token if present
    if (revokeRefreshJti) {
      const token = await this.prisma.refreshToken.findUnique({
        where: { jti: revokeRefreshJti },
      });
      if (token) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revoked: true },
        });
      }
    }

    // Blacklist access token JTI in Redis (15 min TTL)
    if (jti) {
      await redis.set(`blacklist:${jti}`, '1', { EX: 900 });
    }
  }
}
