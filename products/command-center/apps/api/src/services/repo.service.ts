import { resolve } from 'node:path';

/**
 * Resolves paths relative to the monorepo root.
 * The command-center lives at products/command-center/apps/api/,
 * so the monorepo root is 4 levels up.
 */
export function repoRoot(): string {
  return resolve(import.meta.dirname, '..', '..', '..', '..', '..');
}

export function repoPath(...segments: string[]): string {
  return resolve(repoRoot(), ...segments);
}
