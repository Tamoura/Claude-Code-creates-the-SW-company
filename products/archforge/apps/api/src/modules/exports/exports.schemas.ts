/**
 * Export Zod Schemas
 */

import { z } from 'zod';

export const exportArtifactSchema = z.object({
  format: z.enum(['json', 'mermaid', 'plantuml', 'svg']),
});
