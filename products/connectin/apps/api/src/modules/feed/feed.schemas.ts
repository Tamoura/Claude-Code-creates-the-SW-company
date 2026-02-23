import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

function stripHtml(str: string): string {
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(3000, 'Content must be 3000 characters or fewer')
    .transform(stripHtml),
  textDirection: z
    .enum(['RTL', 'LTR', 'AUTO'])
    .default('AUTO'),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000, 'Comment must be 1000 characters or fewer')
    .transform(stripHtml),
  textDirection: z
    .enum(['RTL', 'LTR', 'AUTO'])
    .default('AUTO'),
});

export const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(3000, 'Content must be 3000 characters or fewer')
    .transform(stripHtml),
  textDirection: z
    .enum(['RTL', 'LTR', 'AUTO'])
    .optional(),
});

export type CreatePostInput = z.infer<
  typeof createPostSchema
>;
export type UpdatePostInput = z.infer<
  typeof updatePostSchema
>;
export type CreateCommentInput = z.infer<
  typeof createCommentSchema
>;
