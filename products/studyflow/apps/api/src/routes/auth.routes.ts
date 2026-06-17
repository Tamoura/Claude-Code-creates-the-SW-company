import { FastifyPluginAsync } from 'fastify';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthService, toStudentView } from '../services/auth.service';
import { signupSchema, loginSchema } from '../schemas/auth.schema';
import { validate } from '../lib/validate';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '../lib/session';
import { requireStudentId } from '../lib/request';
import { UnauthorizedError } from '../lib/errors';

/**
 * Auth routes (US-01, FR-001..003). Signup/login are public; logout/me require
 * a valid session. Session token is delivered in the httpOnly `sf_session`
 * cookie — never in the JSON body.
 */
const authRoutes: FastifyPluginAsync = async (fastify) => {
  const repo = new AuthRepository(fastify.prisma);
  const service = new AuthService(repo);

  fastify.post('/auth/signup', async (request, reply) => {
    const input = validate(signupSchema, request.body);
    const { student, token } = await service.signup(input);
    reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return reply.code(201).send({ student });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const input = validate(loginSchema, request.body);
    const { student, token } = await service.login(input);
    reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return reply.code(200).send({ student });
  });

  fastify.post(
    '/auth/logout',
    { preHandler: fastify.sessionAuth },
    async (request, reply) => {
      await service.logout(request.sessionToken);
      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return reply.code(204).send();
    }
  );

  fastify.get(
    '/auth/me',
    { preHandler: fastify.sessionAuth },
    async (request, reply) => {
      const studentId = requireStudentId(request);
      const student = await repo.findStudentById(studentId);
      if (!student) {
        throw new UnauthorizedError('Authentication required');
      }
      return reply.code(200).send({ student: toStudentView(student) });
    }
  );
};

export default authRoutes;
