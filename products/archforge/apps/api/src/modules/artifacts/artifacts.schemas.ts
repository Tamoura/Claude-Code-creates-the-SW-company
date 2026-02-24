/**
 * Artifact Zod Schemas
 *
 * Validation schemas for artifact endpoints.
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
      message:
        'Type is not valid for the selected framework',
      path: ['type'],
    },
  );

export const listArtifactsQuerySchema = z.object({
  search: z.string().optional(),
  framework: z.enum([...VALID_FRAMEWORKS, 'all' as const]).default('all'),
  type: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived', 'all']).default('all'),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateArtifactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .trim()
    .optional(),
  description: z.string().max(5000).optional().nullable(),
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
});

export const regenerateArtifactSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(5000, 'Prompt must be at most 5000 characters'),
});
