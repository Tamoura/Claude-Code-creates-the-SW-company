import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  businessName: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
