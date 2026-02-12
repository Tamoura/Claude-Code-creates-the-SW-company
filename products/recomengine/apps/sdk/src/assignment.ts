/**
 * Simple hash function for A/B test assignment in the SDK.
 * Matches the server-side SHA-256 assignment (lightweight version for browser).
 */
export function hashAssignment(userId: string, experimentId: string): number {
  const input = `${userId}:${experimentId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}
