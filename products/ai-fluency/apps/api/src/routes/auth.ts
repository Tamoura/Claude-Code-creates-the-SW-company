/**
 * routes/auth.ts — Authentication route stubs
 *
 * Sprint 1 stub: returns 501 Not Implemented for all auth endpoints.
 * Full implementation (register, login, token refresh, logout) is
 * planned for Sprint 1.4 (PRO-AUTH-01 through PRO-AUTH-05).
 *
 * Routes registered at /api/v1/auth:
 *   POST /api/v1/auth/register  — User registration
 *   POST /api/v1/auth/login     — User login
 *
 * These stubs ensure the routes exist and return a structured JSON
 * response (not a 404) so security scanners and API clients can
 * discover the endpoints.
 */

import { FastifyInstance } from 'fastify';
import { buildProblemDetails } from '../utils/errors.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/register
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new user account (Sprint 1.4)',
        tags: ['auth'],
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          501: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'integer' },
              detail: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.code(501).send(
        buildProblemDetails(
          'not-implemented',
          501,
          'User registration is not yet implemented. Planned for Sprint 1.4.'
        )
      );
    }
  );

  // POST /api/v1/auth/login
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Authenticate and obtain access token (Sprint 1.4)',
        tags: ['auth'],
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          501: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'integer' },
              detail: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.code(501).send(
        buildProblemDetails(
          'not-implemented',
          501,
          'User login is not yet implemented. Planned for Sprint 1.4.'
        )
      );
    }
  );
}
