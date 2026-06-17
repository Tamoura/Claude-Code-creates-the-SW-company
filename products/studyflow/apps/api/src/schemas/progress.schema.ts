import { z } from 'zod';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date');

/** Log progress (FR-014/015). entryDate defaults to today, must be ≤ today (C-8). */
export const createProgressSchema = z.object({
  value: z.number(),
  entryDate: dateString
    .default(todayIso)
    .refine((d) => d <= todayIso(), { message: 'Entry date cannot be in the future' }),
  note: z.string().max(2000).optional(),
});
export type CreateProgressInput = z.infer<typeof createProgressSchema>;

/** Edit entry (FR-022): partial of log. */
export const updateProgressSchema = z
  .object({
    value: z.number().optional(),
    entryDate: dateString
      .refine((d) => d <= todayIso(), { message: 'Entry date cannot be in the future' })
      .optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const goalIdParamSchema = z.object({ goalId: z.string().uuid() });
export const progressIdParamSchema = z.object({ id: z.string().uuid() });
