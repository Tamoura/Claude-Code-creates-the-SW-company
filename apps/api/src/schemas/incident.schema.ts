import { z } from 'zod';
import { Priority, Impact, Urgency, IncidentStatus } from '@prisma/client';

export const createIncidentSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  priority: z.nativeEnum(Priority),
  impact: z.nativeEnum(Impact),
  urgency: z.nativeEnum(Urgency),
  categoryId: z.string().uuid(),
  affectedUserId: z.string().uuid().optional(),
  reportedById: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  impact: z.nativeEnum(Impact).optional(),
  urgency: z.nativeEnum(Urgency).optional(),
  categoryId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  resolutionNotes: z.string().optional(),
});

export const listIncidentsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().uuid().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;
