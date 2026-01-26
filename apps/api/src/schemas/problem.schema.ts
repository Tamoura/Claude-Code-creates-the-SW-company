import { z } from 'zod';
import { Priority, ProblemStatus } from '@prisma/client';

export const createProblemSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50),
  priority: z.nativeEnum(Priority),
  categoryId: z.string().uuid(),
  createdById: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  rootCause: z.string().optional(),
  workaround: z.string().optional(),
  permanentFix: z.string().optional(),
});

export const updateProblemSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(50).optional(),
  status: z.nativeEnum(ProblemStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  rootCause: z.string().optional(),
  workaround: z.string().optional(),
  permanentFix: z.string().optional(),
});

export const listProblemsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(ProblemStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().uuid().optional(),
});

export const linkIncidentSchema = z.object({
  incidentId: z.string().uuid(),
  linkedById: z.string().uuid(),
});

export const createKnownErrorSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50),
  workaround: z.string().min(20),
  affectedSystems: z.array(z.string()).min(1),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;
export type LinkIncidentInput = z.infer<typeof linkIncidentSchema>;
export type CreateKnownErrorInput = z.infer<typeof createKnownErrorSchema>;
