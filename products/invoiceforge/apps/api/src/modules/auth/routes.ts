import { FastifyInstance } from 'fastify';
import { register, login, refresh, logout } from './handlers';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/auth/register', register);
  fastify.post('/api/auth/login', login);
  fastify.post('/api/auth/refresh', refresh);
  fastify.post('/api/auth/logout', logout);
}
