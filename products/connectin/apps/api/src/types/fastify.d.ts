import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: string;
      jti: string;
    };
    user: {
      sub: string;
      email: string;
      role: string;
      jti: string;
    };
  }
}
