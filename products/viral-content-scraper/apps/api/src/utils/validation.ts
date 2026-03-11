import { z } from 'zod';
import { ValidationError, BadRequestError } from './errors';

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw new ValidationError(errors);
  }
  return result.data;
}

export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestError(result.error.issues[0].message);
  }
  return result.data;
}

// ─── Schemas ─────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contentFilterSchema = paginationSchema.extend({
  platform: z.enum([
    'TWITTER', 'REDDIT', 'LINKEDIN', 'TIKTOK', 'YOUTUBE',
    'INSTAGRAM', 'THREADS', 'BLUESKY', 'HACKERNEWS',
  ]).optional(),
  category: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  mediaType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL', 'LINK', 'POLL']).optional(),
  sortBy: z.enum(['viralityScore', 'engagementRate', 'velocityScore', 'scrapedAt']).default('viralityScore'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d', 'all']).default('24h'),
});

export const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.enum([
    'TWITTER', 'REDDIT', 'LINKEDIN', 'TIKTOK', 'YOUTUBE',
    'INSTAGRAM', 'THREADS', 'BLUESKY', 'HACKERNEWS',
  ]).optional(),
  category: z.string().optional(),
  minScore: z.number().min(0).max(100).default(90),
  keywords: z.array(z.string()).default([]),
});

export const saveContentSchema = z.object({
  contentId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export type ContentFilter = z.infer<typeof contentFilterSchema>;
export type CreateAlert = z.infer<typeof createAlertSchema>;
