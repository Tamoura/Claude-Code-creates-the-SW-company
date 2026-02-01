import { FastifyRequest, FastifyReply } from 'fastify';

export async function getProfile(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function updateProfile(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}
