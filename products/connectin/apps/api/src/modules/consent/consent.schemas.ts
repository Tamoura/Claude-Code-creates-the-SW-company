import { z } from 'zod';

export const grantConsentSchema = z.object({
  type: z.enum([
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'MARKETING_EMAIL',
    'DATA_PROCESSING',
    'ANALYTICS',
  ]),
  granted: z.boolean(),
  version: z.string().min(1).max(20),
});

export type GrantConsentInput = z.infer<
  typeof grantConsentSchema
>;
