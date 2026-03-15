import { z } from 'zod';

export const createAdrSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less'),
  context: z
    .string()
    .min(1, 'Context is required'),
  decision: z
    .string()
    .min(1, 'Decision is required'),
  consequences: z.string().optional(),
  alternatives: z.string().optional(),
  mermaidDiagram: z.string().optional(),
  conversationId: z.string().uuid().optional(),
});

export const updateAdrSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(500)
    .optional(),
  context: z.string().min(1).optional(),
  decision: z.string().min(1).optional(),
  consequences: z.string().optional(),
  alternatives: z.string().optional(),
  mermaidDiagram: z.string().optional(),
});

export const adrStatusUpdateSchema = z.object({
  status: z.enum(['PROPOSED', 'ACCEPTED', 'DEPRECATED', 'SUPERSEDED']),
});

export const adrListQuerySchema = z.object({
  status: z
    .enum(['PROPOSED', 'ACCEPTED', 'DEPRECATED', 'SUPERSEDED'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type CreateAdrInput = z.infer<typeof createAdrSchema>;
export type UpdateAdrInput = z.infer<typeof updateAdrSchema>;
