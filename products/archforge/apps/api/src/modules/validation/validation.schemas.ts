/**
 * Validation Zod Schemas
 *
 * Validation schemas for framework validation endpoints.
 */

import { z } from 'zod';

export const validateArtifactParamsSchema = z.object({
  projectId: z.string().min(1),
  artifactId: z.string().min(1),
});
