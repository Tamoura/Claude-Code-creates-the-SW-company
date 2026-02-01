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

// PDF generation function - replaceable for testing
let pdfGenerator: {
  generatePDF: (data: any) => Promise<Buffer>;
  generateFilename: (num: string, name: string | null) => string;
} | null = null;

async function getPdfModule() {
  if (!pdfGenerator) {
    const mod = await import('./pdf-service');
    pdfGenerator = mod;
  }
  return pdfGenerator;
}

/** Allow tests to replace the PDF generator */
export function setPdfGenerator(gen: typeof pdfGenerator): void {
  pdfGenerator = gen;
}

export async function getInvoicePdf(
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

  const user = await request.server.db.user.findUnique({
    where: { id: request.userId },
    select: { name: true, businessName: true },
  });

  const pdf = await getPdfModule();

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    notes: invoice.notes,
    paymentLink: invoice.paymentLink,
    user: {
      name: user!.name,
      businessName: user!.businessName,
    },
    client: invoice.client
      ? {
          name: invoice.client.name,
          email: invoice.client.email,
          address: invoice.client.address,
          city: invoice.client.city,
          state: invoice.client.state,
          zip: invoice.client.zip,
          country: invoice.client.country,
        }
      : null,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
  };

  const pdfBuffer = await pdf.generatePDF(pdfData);
  const filename = pdf.generateFilename(
    invoice.invoiceNumber,
    invoice.client?.name || null
  );

  reply
    .header('Content-Type', 'application/pdf')
    .header(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    )
    .send(pdfBuffer);
}
