import { z } from 'zod';

export const updateProfileSchema = z.object({
  headlineAr: z
    .string()
    .max(220, 'Headline must be 220 characters or fewer')
    .optional(),
  headlineEn: z
    .string()
    .max(220, 'Headline must be 220 characters or fewer')
    .optional(),
  summaryAr: z.string().optional(),
  summaryEn: z.string().optional(),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or fewer')
    .optional(),
  website: z
    .string()
    .max(255, 'Website URL must be 255 characters or fewer')
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
});

export const addExperienceSchema = z.object({
  company: z
    .string()
    .min(1, 'Company is required')
    .max(200, 'Company must be 200 characters or fewer'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or fewer')
    .optional(),
  description: z.string().optional(),
  startDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Must be a valid date' }
  ),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Must be a valid date',
    })
    .nullable()
    .optional(),
  isCurrent: z.boolean().default(false),
});

export const addSkillsSchema = z.object({
  skillIds: z
    .array(z.string().uuid())
    .min(1, 'At least one skill is required')
    .max(50, 'Maximum 50 skills'),
});

export type UpdateProfileInput = z.infer<
  typeof updateProfileSchema
>;
export type AddExperienceInput = z.infer<
  typeof addExperienceSchema
>;
export type AddSkillsInput = z.infer<typeof addSkillsSchema>;
