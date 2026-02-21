/**
 * Auth utilities for ConnectIn.
 * Manages token storage in memory (XSS-safe) and
 * provides helpers for authentication state.
 */

let accessToken: string | null = null;

/**
 * Module-level singleton for token refresh calls.
 *
 * React Strict Mode (development) fires useEffect twice: mount → cleanup →
 * mount. Without this guard both mounts would call POST /auth/refresh. Since
 * the endpoint rotates the refresh token, the second call would receive an
 * already-rotated (invalid) token and fail.
 *
 * `getOrStartRefresh` ensures only ONE in-flight refresh promise exists at a
 * time. All callers share the same promise; when it settles the singleton is
 * cleared so the next genuine page-load can refresh again.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pendingRefresh: Promise<any> | null = null;

export function getOrStartRefresh<T>(
  doRefresh: () => Promise<T>
): Promise<T> {
  if (_pendingRefresh) return _pendingRefresh as Promise<T>;
  const p = doRefresh();
  _pendingRefresh = p;
  p.finally(() => {
    if (_pendingRefresh === p) _pendingRefresh = null;
  });
  return p;
}

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
