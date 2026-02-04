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
  /**
   * Store JWT token in memory
   */
  setToken(token: string): void {
    accessToken = token;
  },

  /**
   * Retrieve JWT token from memory
   * @returns Token string or null if not set
   */
  getToken(): string | null {
    return accessToken;
  },

  /**
   * Clear JWT token from memory
   */
  clearToken(): void {
    accessToken = null;
  },

  /**
   * Check if token exists in memory
   * @returns true if token exists, false otherwise
   */
  hasToken(): boolean {
    return accessToken !== null;
  },
};
