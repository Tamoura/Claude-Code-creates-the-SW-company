/**
 * Version Zod Schemas
 */

import { z } from 'zod';

export const listVersionsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const restoreVersionSchema = z.object({
  changeSummary: z.string().max(500).optional(),
});
