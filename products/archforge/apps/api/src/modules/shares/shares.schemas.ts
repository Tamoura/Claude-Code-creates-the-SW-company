/**
 * Share Zod Schemas
 */

import { z } from 'zod';

export const createUserShareSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  permission: z.enum(['view', 'edit', 'comment']),
});

export const createLinkShareSchema = z.object({
  permission: z.enum(['view', 'edit', 'comment']),
  expiresInHours: z.number().min(1).max(720).optional(),
});
