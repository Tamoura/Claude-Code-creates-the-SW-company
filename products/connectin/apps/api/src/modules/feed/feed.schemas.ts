import { z } from 'zod';

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(3000, 'Content must be 3000 characters or fewer'),
  textDirection: z
    .enum(['RTL', 'LTR', 'AUTO'])
    .default('AUTO'),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000, 'Comment must be 1000 characters or fewer'),
  textDirection: z
    .enum(['RTL', 'LTR', 'AUTO'])
    .default('AUTO'),
});

export type CreatePostInput = z.infer<
  typeof createPostSchema
>;
export type CreateCommentInput = z.infer<
  typeof createCommentSchema
>;
