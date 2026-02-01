import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createClientSchema,
  updateClientSchema,
  listClientsSchema,
  clientIdParamSchema,
} from './schemas';
import * as clientService from './service';
import { BadRequestError } from '../../lib/errors';

export async function listClients(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = listClientsSchema.safeParse(request.query);
  if (!parsed.success) {
    throw new BadRequestError('Invalid query parameters');
  }

  const result = await clientService.listClients(
    request.server.db,
    request.userId,
    parsed.data
  );

  reply.send(result);
}

export async function getClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = clientIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid client ID');
  }

  const client = await clientService.getClient(
    request.server.db,
    request.userId,
    params.data.id
  );

  reply.send(client);
}

export async function createClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = createClientSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(`Validation failed: ${messages.join(', ')}`);
  }

  const client = await clientService.createClient(
    request.server.db,
    request.userId,
    parsed.data
  );

  reply.status(201).send(client);
}

export async function updateClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = clientIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid client ID');
  }

  const parsed = updateClientSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(`Validation failed: ${messages.join(', ')}`);
  }

  const client = await clientService.updateClient(
    request.server.db,
    request.userId,
    params.data.id,
    parsed.data
  );

  reply.send(client);
}

export async function deleteClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = clientIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid client ID');
  }

  await clientService.deleteClient(
    request.server.db,
    request.userId,
    params.data.id
  );

  reply.send({ message: 'Client deleted' });
}
