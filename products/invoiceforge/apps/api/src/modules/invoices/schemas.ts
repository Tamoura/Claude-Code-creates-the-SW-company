import { z } from 'zod';

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().int().positive(),
    })
  ).min(1),
  taxRate: z.number().int().min(0).max(10000).default(0),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
