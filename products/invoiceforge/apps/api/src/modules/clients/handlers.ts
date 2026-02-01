import { FastifyRequest, FastifyReply } from 'fastify';

export async function listClients(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function getClient(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function createClient(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function updateClient(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function deleteClient(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}
