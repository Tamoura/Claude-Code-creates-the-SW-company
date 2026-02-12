import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server';

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function resetDatabase(app: FastifyInstance): Promise<void> {
  // Delete tasks first due to foreign key constraint, then users
  await app.prisma.task.deleteMany({});
  await app.prisma.user.deleteMany({});
}

/**
 * Helper to register a user and return the token
 */
export async function registerUser(
  app: FastifyInstance,
  email: string = 'test@example.com',
  password: string = 'password123',
): Promise<{ token: string; user: { id: string; email: string } }> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password },
  });

  const body = JSON.parse(response.body);
  return { token: body.token, user: body.user };
}
