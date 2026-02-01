import { FastifyRequest, FastifyReply } from 'fastify';
import * as userService from './service';
import { updateProfileSchema } from './schemas';
import { BadRequestError } from '../../lib/errors';

export async function getProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const profile = await userService.getProfile(
    request.server.db,
    request.userId
  );
  reply.send(profile);
}

export async function updateProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = updateProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(
      `Validation failed: ${messages.join(', ')}`
    );
  }

  const profile = await userService.updateProfile(
    request.server.db,
    request.userId,
    parsed.data
  );
  reply.send(profile);
}

export async function getSubscription(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const subscription = await userService.getSubscription(
    request.server.db,
    request.userId
  );
  reply.send(subscription);
}
