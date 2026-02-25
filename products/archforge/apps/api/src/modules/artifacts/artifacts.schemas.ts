/**
 * Artifact Zod Schemas
 *
 * Validation schemas for all artifact endpoints.
 */

import { z } from 'zod';

export const VALID_FRAMEWORKS = [
  'c4',
  'archimate',
  'togaf',
  'bpmn',
] as const;

export const VALID_TYPES = [
  'c4_context',
  'c4_container',
  'c4_component',
  'archimate_layered',
  'archimate_motivation',
  'togaf_adm',
  'bpmn_process',
] as const;

const FRAMEWORK_TYPE_MAP: Record<string, string[]> = {
  c4: ['c4_context', 'c4_container', 'c4_component'],
  archimate: ['archimate_layered', 'archimate_motivation'],
  togaf: ['togaf_adm'],
  bpmn: ['bpmn_process'],
};

export const generateArtifactSchema = z
  .object({
    prompt: z
      .string()
      .min(10, 'Prompt must be at least 10 characters')
      .max(5000, 'Prompt must be at most 5000 characters'),
    type: z.enum(VALID_TYPES),
    framework: z.enum(VALID_FRAMEWORKS),
    templateId: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      const allowed = FRAMEWORK_TYPE_MAP[data.framework];
      return allowed?.includes(data.type);
    },
    {
      message: 'Type is not valid for the selected framework',
      path: ['type'],
    },
  );

export const regenerateArtifactSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(5000, 'Prompt must be at most 5000 characters'),
});

export const createArtifactSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  type: z.string().min(1).max(30),
  framework: z.enum(['archimate', 'c4', 'togaf']),
  canvasData: z.any().optional(),
});

export const updateArtifactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .trim()
    .optional(),
  description: z.string().max(5000).optional().nullable(),
  type: z.string().min(1).max(30).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  canvasData: z
    .object({
      elements: z.array(z.unknown()).optional(),
      relationships: z.array(z.unknown()).optional(),
      viewport: z
        .object({
          x: z.number(),
          y: z.number(),
          zoom: z.number(),
        })
        .optional(),
    })
    .optional(),
  nlDescription: z.string().max(5000).optional().nullable(),
});

export const listArtifactsQuerySchema = z.object({
  search: z.string().optional(),
  framework: z.enum([...VALID_FRAMEWORKS, 'all' as const]).default('all'),
  type: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived', 'all']).default('all'),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createElementSchema = z.object({
  elementId: z.string().min(1).max(100),
  elementType: z.string().min(1).max(100),
  framework: z.enum(['archimate', 'c4', 'togaf']),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  properties: z.any().default({}),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).default({ x: 0, y: 0, width: 200, height: 100 }),
  layer: z.string().max(30).optional().nullable(),
});

export const updateElementSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  properties: z.any().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});

export const createRelationshipSchema = z.object({
  relationshipId: z.string().min(1).max(100),
  sourceElementId: z.string().min(1).max(100),
  targetElementId: z.string().min(1).max(100),
  relationshipType: z.string().min(1).max(100),
  framework: z.enum(['archimate', 'c4', 'togaf']),
  label: z.string().max(255).optional().nullable(),
  properties: z.any().default({}),
});

export const saveCanvasSchema = z.object({
  canvasData: z.any(),
});
