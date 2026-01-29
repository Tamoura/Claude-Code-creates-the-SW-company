import { z } from 'zod';
import { ChangeStatus, ChangeType, Priority } from '@prisma/client';

export const createChangeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.nativeEnum(ChangeType),
  priority: z.nativeEnum(Priority),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  impact: z.string().min(1, 'Impact description is required'),
  categoryId: z.string().uuid(),
  requesterId: z.string(),
  assigneeId: z.string().optional(),
  implementationPlan: z.string().optional(),
  rollbackPlan: z.string().optional(),
  testPlan: z.string().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
  linkedProblemId: z.string().uuid().optional(),
});

export const updateChangeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.nativeEnum(ChangeStatus).optional(),
  type: z.nativeEnum(ChangeType).optional(),
  priority: z.nativeEnum(Priority).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  impact: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  assigneeId: z.string().optional(),
  implementationPlan: z.string().optional(),
  rollbackPlan: z.string().optional(),
  testPlan: z.string().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
  reviewNotes: z.string().optional(),
  linkedProblemId: z.string().uuid().optional(),
});

export const listChangesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(ChangeStatus).optional(),
  type: z.nativeEnum(ChangeType).optional(),
  priority: z.nativeEnum(Priority).optional(),
  requesterId: z.string().optional(),
  assigneeId: z.string().optional(),
});

export const approveChangeSchema = z.object({
  approverId: z.string(),
  notes: z.string().optional(),
});

export const rejectChangeSchema = z.object({
  rejectedById: z.string(),
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const scheduleChangeSchema = z.object({
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime(),
});

export const implementChangeSchema = z.object({
  actualStartAt: z.string().datetime().optional(),
});

export const completeChangeSchema = z.object({
  actualEndAt: z.string().datetime().optional(),
  reviewNotes: z.string().optional(),
});

export type CreateChangeInput = z.infer<typeof createChangeSchema>;
export type UpdateChangeInput = z.infer<typeof updateChangeSchema>;
export type ListChangesQuery = z.infer<typeof listChangesQuerySchema>;
export type ApproveChangeInput = z.infer<typeof approveChangeSchema>;
export type RejectChangeInput = z.infer<typeof rejectChangeSchema>;
export type ScheduleChangeInput = z.infer<typeof scheduleChangeSchema>;
export type ImplementChangeInput = z.infer<typeof implementChangeSchema>;
export type CompleteChangeInput = z.infer<typeof completeChangeSchema>;
