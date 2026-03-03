/**
 * routes/auth.ts — Auth route stubs
 *
 * Sprint 1.3 placeholder: returns 501 Not Implemented for all auth endpoints.
 * Full implementation (registration, login, token refresh, logout) is scheduled
 * for Sprint 1.4.
 *
 * All responses use RFC 7807 Problem Details format.
 */

import { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/register', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://httpstatuses.com/501',
      title: 'Not Implemented',
      status: 501,
      detail: 'Auth registration will be implemented in Sprint 1.4',
    });
  });

  fastify.post('/login', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://httpstatuses.com/501',
      title: 'Not Implemented',
      status: 501,
      detail: 'Auth login will be implemented in Sprint 1.4',
    });
  });
}
