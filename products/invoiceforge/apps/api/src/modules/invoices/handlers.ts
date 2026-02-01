import { FastifyRequest, FastifyReply } from 'fastify';

export async function listInvoices(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function getInvoice(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function createInvoice(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function updateInvoice(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}

export async function deleteInvoice(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({ error: 'Not implemented' });
}
