import { z } from 'zod';
import { RequestStatus, Priority } from '@prisma/client';

export const createServiceRequestSchema = z.object({
  catalogItemId: z.string().uuid(),
  requesterId: z.string(),
  priority: z.nativeEnum(Priority),
  formData: z.record(z.any()),
  notes: z.string().optional(),
});

export const updateServiceRequestSchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  fulfillerId: z.string().optional(),
  formData: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

export const listServiceRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(RequestStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  requesterId: z.string().optional(),
  fulfillerId: z.string().optional(),
  catalogItemId: z.string().uuid().optional(),
});

export const approveRequestSchema = z.object({
  approverId: z.string(),
  notes: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  rejectedById: z.string(),
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const fulfillRequestSchema = z.object({
  fulfillerId: z.string(),
  notes: z.string().optional(),
});

export const createCatalogItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().uuid(),
  fulfillmentTime: z.number().int().positive(),
  requiresApproval: z.boolean().default(false),
  formSchema: z.record(z.any()),
  isActive: z.boolean().default(true),
});

export const updateCatalogItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  fulfillmentTime: z.number().int().positive().optional(),
  requiresApproval: z.boolean().optional(),
  formSchema: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const listCatalogItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;
export type ListServiceRequestsQuery = z.infer<typeof listServiceRequestsQuerySchema>;
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
export type FulfillRequestInput = z.infer<typeof fulfillRequestSchema>;
export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;
export type ListCatalogItemsQuery = z.infer<typeof listCatalogItemsQuerySchema>;
