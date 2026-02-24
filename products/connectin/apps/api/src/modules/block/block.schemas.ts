import { z } from 'zod';

export const blockUserSchema = z.object({
  userId: z.string().uuid(),
});

export const createReportSchema = z.object({
  targetType: z.enum(['USER', 'POST', 'COMMENT']),
  targetId: z.string().uuid(),
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'HATE_SPEECH',
    'MISINFORMATION',
    'IMPERSONATION',
    'OTHER',
  ]),
  description: z.string().max(1000).optional(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type CreateReportInput = z.infer<
  typeof createReportSchema
>;
