import { z } from 'zod';

export const followUserSchema = z.object({
  userId: z.string().uuid(),
});

export type FollowUserInput = z.infer<
  typeof followUserSchema
>;
