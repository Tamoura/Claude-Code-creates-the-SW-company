import { FastifyRequest, FastifyReply } from 'fastify';
import { defineAbilitiesFor, Action, Subject } from '../lib/abilities.js';

/**
 * Authorization middleware factory
 * Creates a middleware that checks if the authenticated user has permission to perform an action
 */
export function authorize(action: Action, subject: Subject) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Ensure user is authenticated (should be set by authenticate middleware)
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Define abilities for user's role
    const ability = defineAbilitiesFor(request.user.role);

    // Check if user can perform the action
    if (!ability.can(action, subject)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `You do not have permission to ${action} ${subject}`,
      });
    }

    // User is authorized, continue to route handler
  };
}
