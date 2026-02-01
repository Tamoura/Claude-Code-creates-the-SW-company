import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  generateInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesSchema,
  invoiceIdParamSchema,
} from './schemas';
import * as invoiceService from './service';
import { generateInvoice as generateInvoiceAI } from './ai-service';
import { BadRequestError } from '../../lib/errors';

const shareTokenParamSchema = z.object({
  token: z.string().uuid(),
});

export async function generateInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = generateInvoiceSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(
      `Validation failed: ${messages.join(', ')}`
    );
  }

  const aiResult = await generateInvoiceAI(
    parsed.data.prompt,
    request.userId,
    request.server.db
  );

  // If clientId was explicitly provided, override AI match
  if (parsed.data.clientId) {
    aiResult.clientId = parsed.data.clientId;
  }

  const invoice = await invoiceService.createInvoiceFromAI(
    request.server.db,
    request.userId,
    aiResult,
    parsed.data.prompt
  );

  reply.status(201).send(invoice);
}

export async function listInvoices(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = listInvoicesSchema.safeParse(request.query);
  if (!parsed.success) {
    throw new BadRequestError('Invalid query parameters');
  }

  const result = await invoiceService.listInvoices(
    request.server.db,
    request.userId,
    parsed.data
  );

  reply.send(result);
}

export async function getInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = invoiceIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid invoice ID');
  }

  const invoice = await invoiceService.getInvoice(
    request.server.db,
    request.userId,
    params.data.id
  );

  reply.send(invoice);
}

export async function updateInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = invoiceIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid invoice ID');
  }

  const parsed = updateInvoiceSchema.safeParse(request.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new BadRequestError(
      `Validation failed: ${messages.join(', ')}`
    );
  }

  const invoice = await invoiceService.updateInvoice(
    request.server.db,
    request.userId,
    params.data.id,
    parsed.data
  );

  reply.send(invoice);
}

export async function deleteInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = invoiceIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid invoice ID');
  }

  await invoiceService.deleteInvoice(
    request.server.db,
    request.userId,
    params.data.id
  );

  reply.send({ message: 'Invoice deleted' });
}

export async function sendInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = invoiceIdParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid invoice ID');
  }

  const invoice = await invoiceService.sendInvoice(
    request.server.db,
    request.userId,
    params.data.id
  );

  reply.send(invoice);
}

export async function getPublicInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const params = shareTokenParamSchema.safeParse(request.params);
  if (!params.success) {
    throw new BadRequestError('Invalid share token');
  }

  const invoice = await invoiceService.getPublicInvoice(
    request.server.db,
    params.data.token
  );

  reply.send(invoice);
}
