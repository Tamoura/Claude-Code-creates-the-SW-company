import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../types/index';

export async function verifyToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const decoded = await request.jwtVerify();
    request.currentUser = decoded;
  } catch (_err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.currentUser) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (!roles.includes(request.currentUser.role)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to access this resource'
      );
    }
  };
}
