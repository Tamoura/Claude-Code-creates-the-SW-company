/**
 * Artifact Zod Schemas
 *
 * Validation schemas for all artifact endpoints.
 */

import { z } from 'zod';

export const createArtifactSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  type: z.string().min(1).max(30),
  framework: z.enum(['archimate', 'c4', 'togaf']),
  canvasData: z.any().optional(),
});

export const updateArtifactSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  type: z.string().min(1).max(30).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  canvasData: z.any().optional(),
  nlDescription: z.string().max(5000).optional().nullable(),
});

export const listArtifactsQuerySchema = z.object({
  status: z.string().default('draft'),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(20),
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
