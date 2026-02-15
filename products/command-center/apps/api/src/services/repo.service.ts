import { resolve } from 'node:path';

/**
 * Resolves paths relative to the monorepo root.
 * This file lives at products/command-center/apps/api/src/services/,
 * so the monorepo root is 6 levels up.
 */
export function repoRoot(): string {
  return resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..');
}

export function repoPath(...segments: string[]): string {
  return resolve(repoRoot(), ...segments);
}
