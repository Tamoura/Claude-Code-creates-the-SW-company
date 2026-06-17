import { z } from 'zod';

/** Catalog list query (FR-004/005): search + filters + pagination. */
export const listSubjectsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  credits: z.coerce.number().int().optional(),
  term: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;

/** Compare query (FR-006): 2–4 subject ids, CSV or repeated param. */
export const compareQuerySchema = z.object({
  ids: z
    .union([z.string(), z.array(z.string())])
    .transform((v) =>
      (Array.isArray(v) ? v : v.split(','))
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().uuid()).min(2).max(4)),
});
export type CompareQuery = z.infer<typeof compareQuerySchema>;

/** Manual add (FR-009): name required; rest optional. */
export const createSubjectSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1).optional(),
  credits: z.number().int().optional(),
  workload: z.string().trim().min(1).optional(),
  prerequisites: z.string().optional(),
  description: z.string().optional(),
  term: z.string().trim().min(1).optional(),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

/** Edit owned subject (FR-010): partial of create. */
export const updateSubjectSchema = createSubjectSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field must be provided' }
);
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export const idParamSchema = z.object({ id: z.string().uuid() });
