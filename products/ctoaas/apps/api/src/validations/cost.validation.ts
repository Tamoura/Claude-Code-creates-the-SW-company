import { z } from 'zod';

export const tcoOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(255),
  upfrontCost: z.number().min(0, 'Upfront cost must be >= 0'),
  monthlyCost: z.number().min(0, 'Monthly cost must be >= 0'),
  teamSize: z.number().int().min(0, 'Team size must be >= 0'),
  hourlyRate: z.number().min(0, 'Hourly rate must be >= 0'),
  months: z.number().int().min(0, 'Months must be >= 0'),
  scalingFactor: z.number().min(0.1, 'Scaling factor must be >= 0.1').max(5),
});

export const createTcoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  options: z
    .array(tcoOptionSchema)
    .min(1, 'At least one option is required')
    .max(10, 'Maximum 10 options allowed'),
});

export type CreateTcoInput = z.infer<typeof createTcoSchema>;

export const cloudSpendCreateSchema = z.object({
  provider: z.enum(['AWS', 'GCP', 'AZURE', 'OTHER'], {
    errorMap: () => ({
      message: 'Provider must be one of: AWS, GCP, AZURE, OTHER',
    }),
  }),
  spendBreakdown: z.object({
    compute: z.number().min(0).default(0),
    storage: z.number().min(0).default(0),
    networking: z.number().min(0).default(0),
    database: z.number().min(0).default(0),
    other: z.number().min(0).default(0),
  }),
  totalMonthly: z.number().min(0, 'Total monthly must be >= 0'),
  periodStart: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Period start must be YYYY-MM-DD'
  ),
  periodEnd: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Period end must be YYYY-MM-DD'
  ),
});

export type CloudSpendCreateInput = z.infer<typeof cloudSpendCreateSchema>;

export const cloudSpendAnalyzeSchema = z.object({
  provider: z.enum(['AWS', 'GCP', 'AZURE', 'OTHER'], {
    errorMap: () => ({
      message: 'Provider must be one of: AWS, GCP, AZURE, OTHER',
    }),
  }),
  spendBreakdown: z.object({
    compute: z.number().min(0).default(0),
    storage: z.number().min(0).default(0),
    networking: z.number().min(0).default(0),
    database: z.number().min(0).default(0),
    other: z.number().min(0).default(0),
  }),
  totalMonthly: z.number().min(0),
  companySize: z.number().int().min(1, 'Company size must be >= 1'),
});

export type CloudSpendAnalyzeInput = z.infer<typeof cloudSpendAnalyzeSchema>;
