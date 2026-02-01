import { PrismaClient } from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../../lib/errors';
import { paginatedResult, PaginatedResult } from '../../lib/pagination';
import type { GenerateInvoiceResult } from './ai-service';

interface ListInvoicesParams {
  status?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: string;
}

export async function listInvoices(
  db: PrismaClient,
  userId: string,
  params: ListInvoicesParams
): Promise<PaginatedResult<Record<string, unknown>>> {
  const { status, search, page, limit, sortBy, sortOrder } = params;

  const where: Record<string, unknown> = { userId };
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderField = sortBy || 'createdAt';
  const order = sortOrder || 'desc';

  const [data, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { [orderField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  return paginatedResult(data, total, { page, limit });
}

export async function getInvoice(
  db: PrismaClient,
  userId: string,
  invoiceId: string
) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      client: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  return invoice;
}

export async function getPublicInvoice(
  db: PrismaClient,
  shareToken: string
) {
  const invoice = await db.invoice.findFirst({
    where: { shareToken },
    include: {
      client: true,
      items: { orderBy: { sortOrder: 'asc' } },
      user: {
        select: { name: true, businessName: true },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    fromName: invoice.user.name,
    fromBusinessName: invoice.user.businessName,
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
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentLink: invoice.paymentLink,
  };
}

function calculateInvoiceMath(
  items: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number
) {
  const lineAmounts = items.map(
    (item) => item.quantity * item.unitPrice
  );
  const subtotal = lineAmounts.reduce((sum, amt) => sum + amt, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 10000);
  const total = subtotal + taxAmount;

  return { lineAmounts, subtotal, taxAmount, total };
}

export async function createInvoiceFromAI(
  db: PrismaClient,
  userId: string,
  aiResult: GenerateInvoiceResult,
  prompt: string
) {
  return db.$transaction(async (tx) => {
    // Get user and check subscription limit
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // Check if counter needs reset (different month)
    const now = new Date();
    const resetAt = new Date(user.counterResetAt);
    const needsReset =
      resetAt.getFullYear() !== now.getFullYear() ||
      resetAt.getMonth() !== now.getMonth();

    let currentMonthCount = user.invoiceCountThisMonth;
    if (needsReset) {
      currentMonthCount = 0;
      await tx.user.update({
        where: { id: userId },
        data: {
          invoiceCountThisMonth: 0,
          counterResetAt: now,
        },
      });
    }

    // Free tier: 5 invoices/month
    if (user.subscriptionTier === 'free' && currentMonthCount >= 5) {
      throw new AppError(
        'Monthly invoice limit reached. '
        + 'Upgrade to Pro for unlimited invoices.',
        402,
        'SUBSCRIPTION_LIMIT'
      );
    }

    // Increment counters
    const newCounter = user.invoiceCounter + 1;
    await tx.user.update({
      where: { id: userId },
      data: {
        invoiceCounter: newCounter,
        invoiceCountThisMonth: currentMonthCount + 1,
      },
    });

    // Generate invoice number
    const invoiceNumber = `INV-${String(newCounter).padStart(4, '0')}`;

    // Server-side math recalculation
    const { lineAmounts, subtotal, taxAmount, total } =
      calculateInvoiceMath(aiResult.items, aiResult.taxRate);

    // Resolve client
    let clientId = aiResult.clientId || null;
    if (!clientId && aiResult.clientName) {
      // Create a new client
      const newClient = await tx.client.create({
        data: {
          userId,
          name: aiResult.clientName,
          email: aiResult.clientEmail || undefined,
        },
      });
      clientId = newClient.id;
    }

    // Create invoice with items
    const invoice = await tx.invoice.create({
      data: {
        userId,
        clientId,
        invoiceNumber,
        status: 'draft',
        invoiceDate: new Date(),
        dueDate: new Date(aiResult.dueDate),
        subtotal,
        taxRate: aiResult.taxRate,
        taxAmount,
        total,
        notes: aiResult.notes,
        aiPrompt: prompt,
        items: {
          create: aiResult.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: lineAmounts[index],
            sortOrder: index,
          })),
        },
      },
      include: {
        client: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return invoice;
  });
}

interface UpdateInvoiceInput {
  clientId?: string;
  invoiceDate?: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function updateInvoice(
  db: PrismaClient,
  userId: string,
  invoiceId: string,
  input: UpdateInvoiceInput
) {
  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, userId },
  });

  if (!existing) {
    throw new NotFoundError('Invoice not found');
  }

  if (existing.status !== 'draft') {
    throw new ForbiddenError(
      'Only draft invoices can be edited'
    );
  }

  return db.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};

    if (input.clientId !== undefined) {
      updateData.clientId = input.clientId;
    }
    if (input.invoiceDate) {
      updateData.invoiceDate = new Date(input.invoiceDate);
    }
    if (input.dueDate) {
      updateData.dueDate = new Date(input.dueDate);
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Handle items replacement and math recalculation
    if (input.items && input.items.length > 0) {
      const taxRate = input.taxRate ?? existing.taxRate;
      const { lineAmounts, subtotal, taxAmount, total } =
        calculateInvoiceMath(input.items, taxRate);

      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.total = total;

      // Delete existing items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId },
      });

      // Create new items
      await tx.invoiceItem.createMany({
        data: input.items.map((item, index) => ({
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: lineAmounts[index],
          sortOrder: index,
        })),
      });
    } else if (input.taxRate !== undefined) {
      // Recalculate with new tax rate using existing items
      const items = await tx.invoiceItem.findMany({
        where: { invoiceId },
      });
      const { subtotal, taxAmount, total } = calculateInvoiceMath(
        items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        input.taxRate
      );
      updateData.subtotal = subtotal;
      updateData.taxRate = input.taxRate;
      updateData.taxAmount = taxAmount;
      updateData.total = total;
    }

    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        client: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return invoice;
  });
}

export async function deleteInvoice(
  db: PrismaClient,
  userId: string,
  invoiceId: string
) {
  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, userId },
  });

  if (!existing) {
    throw new NotFoundError('Invoice not found');
  }

  if (existing.status !== 'draft') {
    throw new ForbiddenError(
      'Only draft invoices can be deleted. '
      + 'Sent, paid, and overdue invoices must be '
      + 'kept for tax compliance.'
    );
  }

  await db.invoice.delete({ where: { id: invoiceId } });
}

export async function sendInvoice(
  db: PrismaClient,
  userId: string,
  invoiceId: string
) {
  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, userId },
  });

  if (!existing) {
    throw new NotFoundError('Invoice not found');
  }

  if (existing.status !== 'draft') {
    throw new ForbiddenError(
      'Only draft invoices can be sent'
    );
  }

  return db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
    include: {
      client: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });
}
