import { z } from 'zod';

export const sendRequestSchema = z.object({
  receiverId: z.string().uuid('Must be a valid user ID'),
  message: z
    .string()
    .max(300, 'Message must be 300 characters or fewer')
    .optional(),
});

export type SendRequestInput = z.infer<
  typeof sendRequestSchema
>;
