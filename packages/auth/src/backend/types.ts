export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      type: `https://connectsw.io/errors/${this.code}`,
      title: this.code.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      status: this.statusCode,
      detail: this.message,
    };
  }
}

export interface AuthPluginOptions {
  /**
   * Custom permissions for your product.
   * Default: ['read', 'write']
   */
  permissions?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: Record<string, boolean>;
  lastUsedAt: Date | null;
  createdAt: Date;
  user: AuthUser;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    optionalAuth: (request: FastifyRequest) => Promise<void>;
    requirePermission: (permission: string) => (request: FastifyRequest) => Promise<void>;
    requireAdmin: (request: FastifyRequest) => Promise<void>;
    prisma: Record<string, any>;
    redis: { get(key: string): Promise<string | null>; set(key: string, value: string, ...args: (string | number)[]): Promise<string>; del(...keys: string[]): Promise<number> } | null;
  }

  interface FastifyRequest {
    currentUser: AuthUser;
    apiKey?: AuthApiKey;
  }
}
