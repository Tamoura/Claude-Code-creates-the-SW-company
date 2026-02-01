import { FastifyInstance } from 'fastify';
import { register, login, refresh, logout } from './handlers';

const authRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/auth/register', authRateLimit, register);
  fastify.post('/api/auth/login', authRateLimit, login);
  fastify.post('/api/auth/refresh', refresh);
  fastify.post('/api/auth/logout', logout);
}
