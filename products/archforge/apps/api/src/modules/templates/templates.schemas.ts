/**
 * Template Zod Schemas
 */

import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .trim(),
  description: z.string().max(2000).optional().nullable(),
  category: z.enum([
    'enterprise',
    'solution',
    'application',
    'infrastructure',
    'business_process',
    'custom',
  ]),
  subcategory: z.string().max(100).optional().nullable(),
  framework: z.enum(['c4', 'archimate', 'togaf', 'bpmn']),
  canvasData: z.object({
    elements: z.array(z.unknown()).default([]),
    relationships: z.array(z.unknown()).default([]),
    viewport: z
      .object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
      })
      .default({ x: 0, y: 0, zoom: 1 }),
  }),
  isPublic: z.boolean().default(false),
  artifactId: z.string().uuid().optional(),
});

export const listTemplatesQuerySchema = z.object({
  category: z.string().optional(),
  framework: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const instantiateTemplateSchema = z.object({
  projectId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255)
    .trim()
    .optional(),
});
