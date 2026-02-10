import { FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  currentUser: JwtPayload;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: JwtPayload;
    tenantId?: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
