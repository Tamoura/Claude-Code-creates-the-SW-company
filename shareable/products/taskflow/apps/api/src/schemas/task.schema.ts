import { z } from 'zod';

/** Status values mirror the Prisma enum. [FR-002] */
export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  status: taskStatusSchema.default('TODO'),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().uuid('projectId must be a UUID'),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: taskStatusSchema.optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'at least one field must be provided',
  });

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idParamSchema = z.object({
  id: z.string().uuid('id must be a UUID'),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
