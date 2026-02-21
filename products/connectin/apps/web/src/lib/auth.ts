/**
 * Auth utilities for ConnectIn.
 * Manages token storage in memory (XSS-safe) and
 * provides helpers for authentication state.
 */

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}

/**
 * Parse a JWT token to extract payload (without verification).
 * Used for reading user info from the token on the client side.
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}
