import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, JWTPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    // Verify Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token format. Expected: Bearer <token>',
      });
    }

    const token = parts[1];

    // Verify JWT token
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token has expired',
        });
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'User account is inactive',
      });
    }

    // Attach user to request
    request.user = user;
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

// Extend Fastify types to include user on request
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean;
      organizationId: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}
