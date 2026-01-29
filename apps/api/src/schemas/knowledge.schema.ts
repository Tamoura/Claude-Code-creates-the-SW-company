import { z } from 'zod';
import { KBStatus } from '@prisma/client';

export const createKnowledgeArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  categoryId: z.string().uuid(),
  authorId: z.string(),
  keywords: z.array(z.string()).default([]),
});

export const updateKnowledgeArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.nativeEnum(KBStatus).optional(),
  categoryId: z.string().uuid().optional(),
  keywords: z.array(z.string()).optional(),
  changeNotes: z.string().optional(),
});

export const listKnowledgeArticlesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(KBStatus).optional(),
  categoryId: z.string().uuid().optional(),
  authorId: z.string().optional(),
  keyword: z.string().optional(),
  search: z.string().optional(),
});

export const publishArticleSchema = z.object({
  publisherId: z.string(),
});

export const rateArticleSchema = z.object({
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;
export type UpdateKnowledgeArticleInput = z.infer<typeof updateKnowledgeArticleSchema>;
export type ListKnowledgeArticlesQuery = z.infer<typeof listKnowledgeArticlesQuerySchema>;
export type PublishArticleInput = z.infer<typeof publishArticleSchema>;
export type RateArticleInput = z.infer<typeof rateArticleSchema>;
