import { z } from 'zod';

export const generateInvoiceSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters')
    .max(2000, 'Prompt must not exceed 2000 characters'),
  clientId: z.string().uuid().optional(),
});

export const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  taxRate: z.number().int().min(0).max(10000).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().positive(),
  })).min(1).optional(),
});

export const listInvoicesSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum([
    'createdAt', 'invoiceDate', 'dueDate', 'total', 'invoiceNumber',
  ]).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const invoiceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
