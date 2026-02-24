/**
 * Comment Zod Schemas
 */

import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000).trim(),
  parentCommentId: z.string().uuid().optional().nullable(),
  elementId: z.string().max(100).optional().nullable(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000).trim(),
});

export const listCommentsQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'all']).default('all'),
  elementId: z.string().max(100).optional(),
});
