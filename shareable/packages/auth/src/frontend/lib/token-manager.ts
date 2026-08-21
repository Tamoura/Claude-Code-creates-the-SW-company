/**
 * Token Manager
 *
 * Manages JWT access tokens in memory only.
 * SECURITY: Tokens are never written to localStorage or sessionStorage
 * to prevent XSS-based token theft. In-memory storage means tokens
 * are cleared on page refresh, which is acceptable because refresh
 * tokens (stored as httpOnly cookies) handle session persistence.
 */

let accessToken: string | null = null;

export const TokenManager = {
  setToken(token: string): void {
    accessToken = token;
  },

  getToken(): string | null {
    return accessToken;
  },

  clearToken(): void {
    accessToken = null;
  },

  hasToken(): boolean {
    return accessToken !== null;
  },
};
