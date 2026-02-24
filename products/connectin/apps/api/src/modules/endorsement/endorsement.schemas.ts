import { z } from 'zod';

export const endorseSkillSchema = z.object({
  profileSkillId: z.string().uuid(),
});

export type EndorseSkillInput = z.infer<
  typeof endorseSkillSchema
>;
