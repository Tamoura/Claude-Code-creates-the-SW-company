import { z } from 'zod';

/** Today as YYYY-MM-DD in UTC (for date comparisons). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date');

/** Create goal (FR-011/012/013). dueDate must be strictly in the future (BR-006). */
export const createGoalSchema = z.object({
  selectionId: z.string().uuid(),
  title: z.string().trim().min(1),
  metricType: z.enum(['numeric', 'boolean', 'percentage']),
  target: z.number().positive(),
  cadence: z.enum(['daily', 'weekly']).default('daily'),
  dueDate: dateString.refine((d) => d > todayIso(), {
    message: 'Due date must be in the future',
  }),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

/** Edit goal (FR-022): partial of create, no selectionId change. */
export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    metricType: z.enum(['numeric', 'boolean', 'percentage']).optional(),
    target: z.number().positive().optional(),
    cadence: z.enum(['daily', 'weekly']).optional(),
    dueDate: dateString
      .refine((d) => d > todayIso(), { message: 'Due date must be in the future' })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

/** List goals query (US-08). */
export const listGoalsQuerySchema = z.object({
  selectionId: z.string().uuid().optional(),
  status: z
    .enum(['draft', 'active', 'at_risk', 'completed', 'abandoned'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

export const goalIdParamSchema = z.object({ id: z.string().uuid() });
