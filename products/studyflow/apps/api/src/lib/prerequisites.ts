/**
 * Parses a subject's `prerequisites` field (a comma-separated code list,
 * advisory only — BR-007) into normalised codes.
 */
export function parsePrerequisites(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Computes which of a subject's prerequisite codes are not yet satisfied by the
 * student's already-selected subject codes. Case-insensitive; preserves the
 * declared casing of the unmet prerequisite.
 */
export function computeUnmetPrerequisites(
  prerequisitesRaw: string | null | undefined,
  selectedCodes: string[]
): string[] {
  const required = parsePrerequisites(prerequisitesRaw);
  const have = new Set(selectedCodes.map((c) => c.toLowerCase()));
  return required.filter((code) => !have.has(code.toLowerCase()));
}
