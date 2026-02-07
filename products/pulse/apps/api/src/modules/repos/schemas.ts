import { z } from 'zod';

// ────────────────────────────────────────
// Request Schemas
// ────────────────────────────────────────

export const connectRepoSchema = z.object({
  githubId: z.number().int().positive(),
  name: z.string().min(1),
  fullName: z.string().min(1),
  organization: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  defaultBranch: z.string().default('main'),
  isPrivate: z.boolean().default(false),
});

export const repoIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listReposQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  syncStatus: z.enum(['idle', 'syncing', 'complete', 'error']).optional(),
});

export const githubCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type ConnectRepoInput = z.infer<typeof connectRepoSchema>;
export type RepoIdParam = z.infer<typeof repoIdParamSchema>;
export type ListReposQuery = z.infer<typeof listReposQuerySchema>;
export type GitHubCallbackQuery = z.infer<typeof githubCallbackQuerySchema>;
