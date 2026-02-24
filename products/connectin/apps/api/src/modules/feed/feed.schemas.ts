import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

function stripHtml(str: string): string {
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export const pollInputSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(100)).min(2, 'Poll must have at least 2 options').max(4, 'Poll must have at most 4 options'),
  durationDays: z.number().int().min(1).max(14).default(7),
});

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(3000, 'Content must be 3000 characters or fewer')
    .transform(stripHtml),
  textDirection: z
    .enum(['RTL', 'LTR', 'AUTO'])
    .default('AUTO'),
  mediaIds: z
    .array(z.string().uuid())
    .max(4, 'Maximum 4 media attachments per post')
    .optional(),
  poll: pollInputSchema.optional(),
});

export type PollInput = z.infer<typeof pollInputSchema>;

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

export const reactToPostSchema = z.object({
  type: z.enum([
    'LIKE',
    'CELEBRATE',
    'SUPPORT',
    'LOVE',
    'INSIGHTFUL',
    'FUNNY',
  ]),
});

export type ReactToPostInput = z.infer<
  typeof reactToPostSchema
>;
export type CreatePostInput = z.infer<
  typeof createPostSchema
>;
export type UpdatePostInput = z.infer<
  typeof updatePostSchema
>;
export type CreateCommentInput = z.infer<
  typeof createCommentSchema
>;
