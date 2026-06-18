import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().max(255).optional(),
});

export type CreateConversationInput = z.infer<
  typeof createConversationSchema
>;

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(255),
});

export type UpdateConversationInput = z.infer<
  typeof updateConversationSchema
>;

export const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
