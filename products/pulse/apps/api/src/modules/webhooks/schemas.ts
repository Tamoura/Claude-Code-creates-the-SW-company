import { z } from 'zod';

export const webhookHeadersSchema = z.object({
  'x-hub-signature-256': z.string().min(1),
  'x-github-event': z.string().min(1),
  'x-github-delivery': z.string().min(1),
});

export type WebhookHeaders = z.infer<typeof webhookHeadersSchema>;

// ── Webhook event payload schemas ─────────────────

const commitAuthorSchema = z.object({
  name: z.string(),
  email: z.string(),
  username: z.string().optional(),
});

const pushCommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.string(),
  author: commitAuthorSchema,
  added: z.array(z.string()),
  removed: z.array(z.string()),
  modified: z.array(z.string()),
});

export const pushEventSchema = z.object({
  ref: z.string(),
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
  }),
  commits: z.array(pushCommitSchema),
});

export type PushEventPayload = z.infer<typeof pushEventSchema>;

export const pullRequestEventSchema = z.object({
  action: z.string(),
  number: z.number(),
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    user: z.object({
      login: z.string(),
      avatar_url: z.string(),
    }),
    additions: z.number(),
    deletions: z.number(),
    commits: z.number(),
    draft: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    merged_at: z.string().nullable(),
    closed_at: z.string().nullable(),
    html_url: z.string(),
  }),
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
  }),
});

export type PullRequestEventPayload = z.infer<
  typeof pullRequestEventSchema
>;

export const deploymentEventSchema = z.object({
  action: z.string(),
  deployment: z.object({
    id: z.number(),
    sha: z.string(),
    environment: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
  }),
});

export type DeploymentEventPayload = z.infer<
  typeof deploymentEventSchema
>;
