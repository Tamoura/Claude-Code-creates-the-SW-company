import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

/**
 * Strip HTML tags using sanitize-html (consistent with feed module).
 */
function stripHtml(str: string): string {
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  });
}


export const updateProfileSchema = z.object({
  headlineAr: z
    .string()
    .max(220, 'Headline must be 220 characters or fewer')
    .transform(stripHtml)
    .optional(),
  headlineEn: z
    .string()
    .max(220, 'Headline must be 220 characters or fewer')
    .transform(stripHtml)
    .optional(),
  summaryAr: z.string().transform(stripHtml).optional(),
  summaryEn: z.string().transform(stripHtml).optional(),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or fewer')
    .optional(),
  website: z
    .string()
    .max(255, 'Website URL must be 255 characters or fewer')
    .url('Must be a valid URL')
    .refine(
      (url) => /^https?:\/\//i.test(url),
      'Website must use http or https protocol'
    )
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

export const updateExperienceSchema = z
  .object({
    company: z
      .string()
      .min(1, 'Company is required')
      .max(200, 'Company must be 200 characters or fewer')
      .optional(),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or fewer')
      .optional(),
    location: z
      .string()
      .max(100, 'Location must be 100 characters or fewer')
      .optional(),
    description: z.string().optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Must be a valid date',
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Must be a valid date',
      })
      .nullable()
      .optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' }
  );

export const addSkillsSchema = z.object({
  skillIds: z
    .array(z.string().uuid())
    .min(1, 'At least one skill is required')
    .max(50, 'Maximum 50 skills'),
});

export const addEducationSchema = z.object({
  institution: z
    .string()
    .min(1, 'Institution is required')
    .max(200, 'Institution must be 200 characters or fewer'),
  degree: z
    .string()
    .min(1, 'Degree is required')
    .max(200, 'Degree must be 200 characters or fewer'),
  fieldOfStudy: z
    .string()
    .max(200, 'Field of study must be 200 characters or fewer')
    .optional(),
  description: z.string().optional(),
  startYear: z
    .number()
    .int()
    .min(1950, 'Start year must be 1950 or later')
    .max(2030, 'Start year must be 2030 or earlier'),
  endYear: z
    .number()
    .int()
    .min(1950, 'End year must be 1950 or later')
    .max(2030, 'End year must be 2030 or earlier')
    .optional(),
}).refine(
  (data) =>
    !data.endYear || data.endYear >= data.startYear,
  {
    message: 'End year must be greater than or equal to start year',
    path: ['endYear'],
  }
);

export const updateEducationSchema = z.object({
  institution: z
    .string()
    .min(1, 'Institution is required')
    .max(200, 'Institution must be 200 characters or fewer')
    .optional(),
  degree: z
    .string()
    .min(1, 'Degree is required')
    .max(200, 'Degree must be 200 characters or fewer')
    .optional(),
  fieldOfStudy: z
    .string()
    .max(200, 'Field of study must be 200 characters or fewer')
    .optional(),
  description: z.string().optional(),
  startYear: z
    .number()
    .int()
    .min(1950, 'Start year must be 1950 or later')
    .max(2030, 'Start year must be 2030 or earlier')
    .optional(),
  endYear: z
    .number()
    .int()
    .min(1950, 'End year must be 1950 or later')
    .max(2030, 'End year must be 2030 or earlier')
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<
  typeof updateProfileSchema
>;
export type AddExperienceInput = z.infer<
  typeof addExperienceSchema
>;
export type UpdateExperienceInput = z.infer<
  typeof updateExperienceSchema
>;
export type AddSkillsInput = z.infer<typeof addSkillsSchema>;
export type AddEducationInput = z.infer<
  typeof addEducationSchema
>;
export type UpdateEducationInput = z.infer<
  typeof updateEducationSchema
>;
