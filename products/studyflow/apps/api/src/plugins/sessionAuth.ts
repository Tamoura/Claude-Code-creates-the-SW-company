import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { AuthRepository } from '../repositories/auth.repository';
import { hashSessionToken, SESSION_COOKIE_NAME } from '../lib/session';
import { UnauthorizedError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the `sessionAuth` pre-handler on authenticated routes. */
    studentId?: string;
    /** The raw opaque session token (for logout). */
    sessionToken?: string;
  }
  interface FastifyInstance {
    /** Pre-handler enforcing a valid session and attaching `request.studentId`. */
    sessionAuth: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

/**
 * Decorates the app with a `sessionAuth` pre-handler (FR-003, ADR-002): reads
 * the `sf_session` cookie, hashes it, looks up a non-expired Session, and
 * attaches `request.studentId`. Missing/invalid ⇒ 401 (non-enumerating).
 */
const sessionAuthPlugin: FastifyPluginAsync = async (fastify) => {
  const repo = new AuthRepository(fastify.prisma);

  fastify.decorateRequest('studentId', undefined);
  fastify.decorateRequest('sessionToken', undefined);

  fastify.decorate(
    'sessionAuth',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const token = request.cookies?.[SESSION_COOKIE_NAME];
      if (!token) {
        throw new UnauthorizedError('Authentication required');
      }
      const session = await repo.findValidSession(hashSessionToken(token));
      if (!session) {
        throw new UnauthorizedError('Authentication required');
      }
      request.studentId = session.studentId;
      request.sessionToken = token;
    }
  );
};

export default fp(sessionAuthPlugin, {
  name: 'sessionAuth',
  dependencies: ['prisma'],
});
