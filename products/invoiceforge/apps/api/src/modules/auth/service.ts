import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import {
  ConflictError,
  UnauthorizedError,
} from '../../lib/errors';
import type { JwtPayload } from '../../plugins/auth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  subscriptionTier: string;
  createdAt: Date;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptRounds);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: config.jwtAccessExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
}

export function toUserResponse(user: {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  subscriptionTier: string;
  createdAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    businessName: user.businessName,
    subscriptionTier: user.subscriptionTier,
    createdAt: user.createdAt,
  };
}

export async function registerUser(
  db: PrismaClient,
  input: { email: string; password: string; name: string; businessName?: string }
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const existing = await db.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      businessName: input.businessName || null,
      passwordHash,
    },
  });

  const tokens = await createSession(db, user.id, user.email);

  return { user: toUserResponse(user), tokens };
}

export async function loginUser(
  db: PrismaClient,
  input: { email: string; password: string }
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const user = await db.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await createSession(db, user.id, user.email);

  return { user: toUserResponse(user), tokens };
}

export async function refreshSession(
  db: PrismaClient,
  refreshToken: string
): Promise<AuthTokens> {
  const session = await db.session.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!session) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    throw new UnauthorizedError('Refresh token expired');
  }

  // Delete old session
  await db.session.delete({ where: { id: session.id } });

  // Create new session
  return createSession(db, session.userId, session.user.email);
}

export async function logoutUser(
  db: PrismaClient,
  refreshToken: string
): Promise<void> {
  await db.session.deleteMany({
    where: { token: refreshToken },
  });
}

async function createSession(
  db: PrismaClient,
  userId: string,
  email: string
): Promise<AuthTokens> {
  const accessToken = generateAccessToken({ userId, email });
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.session.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}
