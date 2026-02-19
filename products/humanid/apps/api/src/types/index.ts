/**
 * HumanID Type Definitions
 *
 * AppError with RFC 7807 format and typed subclasses.
 * Fastify instance/request type augmentations.
 */

import type { User, ApiKey } from '@prisma/client';

// ==================== Error Types (RFC 7807) ====================

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  request_id?: string;
}

/**
 * Base application error with RFC 7807 Problem Details format.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON(): ErrorResponse {
    return {
      type: `https://humanid.dev/errors/${this.code}`,
      title: this.code.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      status: this.statusCode,
      detail: this.message,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'not-found', message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'unauthorized', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, 'forbidden', message);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'bad-request', message, details);
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(409, 'conflict', message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(422, 'validation-error', message, details);
    this.name = 'ValidationError';
  }
}

// ==================== Auth Types ====================

export interface RegisterRequest {
  email: string;
  password: string;
  role?: 'HOLDER' | 'ISSUER' | 'DEVELOPER';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  role: string;
  access_token: string;
  refresh_token: string;
  created_at?: string;
}

// ==================== Fastify Extensions ====================

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
    apiKey?: ApiKey;
    startTime?: number;
  }

  interface FastifyInstance {
    prisma: import('@prisma/client').PrismaClient;
    redis: import('ioredis').Redis | null;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}
