import { z } from 'zod';

/** Server-side default when the client omits entryDate: UTC "today". */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The latest entryDate we accept (BUG-001 / C-8). We allow one calendar day
 * ahead of UTC so a user in a timezone ahead of UTC (e.g. UTC+3, logging in the
 * evening) can record progress for their *local* today — which may already be
 * tomorrow's date in UTC. Anything beyond +1 day is in the future for every
 * timezone on earth, so it is still rejected.
 */
function maxEntryDateIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date');

/** Log progress (FR-014/015). entryDate defaults to today, must be ≤ today in the user's timezone (C-8). */
export const createProgressSchema = z.object({
  value: z.number(),
  entryDate: dateString
    .default(todayIso)
    .refine((d) => d <= maxEntryDateIso(), { message: 'Entry date cannot be in the future' }),
  note: z.string().max(2000).optional(),
});
export type CreateProgressInput = z.infer<typeof createProgressSchema>;

/** Edit entry (FR-022): partial of log. */
export const updateProgressSchema = z
  .object({
    value: z.number().optional(),
    entryDate: dateString
      .refine((d) => d <= maxEntryDateIso(), { message: 'Entry date cannot be in the future' })
      .optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const goalIdParamSchema = z.object({ goalId: z.string().uuid() });
export const progressIdParamSchema = z.object({ id: z.string().uuid() });
