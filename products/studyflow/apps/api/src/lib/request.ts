import { FastifyRequest } from 'fastify';
import { UnauthorizedError } from './errors';

/**
 * Returns the authenticated student's id, asserting the `sessionAuth`
 * pre-handler ran. Throws 401 defensively if a route is mis-wired.
 */
export function requireStudentId(request: FastifyRequest): string {
  if (!request.studentId) {
    throw new UnauthorizedError('Authentication required');
  }
  return request.studentId;
}
