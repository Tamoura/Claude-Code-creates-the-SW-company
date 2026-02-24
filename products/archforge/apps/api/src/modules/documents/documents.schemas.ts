/**
 * Document Ingestion Zod Schemas
 *
 * Validation schemas for document endpoints.
 */

import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(500000, 'Content must be at most 500,000 characters'),
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(500, 'Filename must be at most 500 characters')
    .trim(),
  fileType: z.enum(['text', 'markdown'], {
    errorMap: () => ({ message: 'fileType must be text or markdown' }),
  }),
});

export const generateFromDocumentSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  framework: z.string().min(1, 'Framework is required'),
});
