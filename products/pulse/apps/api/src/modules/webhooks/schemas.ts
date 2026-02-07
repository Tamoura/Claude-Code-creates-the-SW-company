import { z } from 'zod';

export const webhookHeadersSchema = z.object({
  'x-hub-signature-256': z.string().min(1),
  'x-github-event': z.string().min(1),
  'x-github-delivery': z.string().min(1),
});

export type WebhookHeaders = z.infer<typeof webhookHeadersSchema>;
