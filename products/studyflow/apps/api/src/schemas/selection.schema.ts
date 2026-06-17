import { z } from 'zod';

/** Add a subject to the plan (FR-007/025). */
export const createSelectionSchema = z.object({
  subjectId: z.string().uuid(),
  prereqWarningAck: z.boolean().optional(),
});
export type CreateSelectionInput = z.infer<typeof createSelectionSchema>;

export const selectionIdParamSchema = z.object({ id: z.string().uuid() });
