/**
 * Common type definitions for Tech Management Helper API
 */

// Health check response
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
}

// API Error response
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// JWT payload from NextAuth
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
}

// Request context with authenticated user
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
