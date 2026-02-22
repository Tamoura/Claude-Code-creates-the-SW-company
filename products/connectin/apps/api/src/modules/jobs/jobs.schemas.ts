import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

function stripHtml(str: string): string {
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export const createJobSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or fewer')
      .transform(stripHtml),
    company: z
      .string()
      .min(1, 'Company is required')
      .max(200, 'Company must be 200 characters or fewer')
      .transform(stripHtml),
    location: z
      .string()
      .max(200, 'Location must be 200 characters or fewer')
      .transform(stripHtml)
      .optional(),
    workType: z
      .enum(['ONSITE', 'HYBRID', 'REMOTE'])
      .default('ONSITE'),
    experienceLevel: z
      .enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'])
      .default('MID'),
    description: z
      .string()
      .min(1, 'Description is required')
      .transform(stripHtml),
    requirements: z.string().transform(stripHtml).optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    salaryCurrency: z
      .string()
      .max(10)
      .default('USD')
      .optional(),
    language: z.string().max(5).default('en'),
  })
  .refine(
    (data) => {
      if (
        data.salaryMin !== undefined &&
        data.salaryMax !== undefined
      ) {
        return data.salaryMin <= data.salaryMax;
      }
      return true;
    },
    {
      message: 'salaryMin must be less than or equal to salaryMax',
      path: ['salaryMin'],
    }
  );

export const updateJobSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(200)
      .transform(stripHtml)
      .optional(),
    company: z.string().min(1).max(200).transform(stripHtml).optional(),
    location: z.string().max(200).transform(stripHtml).optional(),
    workType: z
      .enum(['ONSITE', 'HYBRID', 'REMOTE'])
      .optional(),
    experienceLevel: z
      .enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'])
      .optional(),
    description: z.string().min(1).transform(stripHtml).optional(),
    requirements: z.string().transform(stripHtml).optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    salaryCurrency: z.string().max(10).optional(),
    language: z.string().max(5).optional(),
    status: z.enum(['OPEN', 'CLOSED']).optional(),
  })
  .refine(
    (data) => {
      if (
        data.salaryMin !== undefined &&
        data.salaryMax !== undefined
      ) {
        return data.salaryMin <= data.salaryMax;
      }
      return true;
    },
    {
      message: 'salaryMin must be less than or equal to salaryMax',
      path: ['salaryMin'],
    }
  );

export const applyJobSchema = z.object({
  coverNote: z
    .string()
    .max(500, 'Cover note must be 500 characters or fewer')
    .transform(stripHtml)
    .optional(),
});

export const jobQuerySchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  workType: z
    .enum(['ONSITE', 'HYBRID', 'REMOTE'])
    .optional(),
  experienceLevel: z
    .enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'])
    .optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ApplyJobInput = z.infer<typeof applyJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
