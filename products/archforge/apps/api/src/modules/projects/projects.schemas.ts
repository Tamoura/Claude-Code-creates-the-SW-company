/**
 * Project Zod Schemas
 *
 * Validation schemas for all project endpoints.
 */

import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be at most 255 characters')
    .trim()
    .refine((val) => val.trim().length > 0, 'Project name cannot be only whitespace'),
  description: z.string().max(2000).optional().nullable(),
  frameworkPreference: z.enum(['archimate', 'c4', 'togaf', 'auto']).default('auto'),
});

export const updateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be at most 255 characters')
    .trim()
    .refine((val) => val.trim().length > 0, 'Project name cannot be only whitespace')
    .optional(),
  description: z.string().max(2000).optional().nullable(),
  frameworkPreference: z.enum(['archimate', 'c4', 'togaf', 'auto']).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const deleteProjectSchema = z.object({
  confirmName: z.string().min(1, 'Project name confirmation is required'),
});

export const listProjectsQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).default('active'),
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'editor', 'viewer']),
});
