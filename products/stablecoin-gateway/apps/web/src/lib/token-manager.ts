/**
 * Token Manager
 *
 * Manages JWT access tokens in memory only.
 *
 * SECURITY: Access tokens are stored in a private variable and
 * are never persisted to localStorage or sessionStorage. This
 * prevents XSS attacks from stealing user session tokens.
 *
 * The refresh token is handled via httpOnly cookies set by the
 * server, which are also not accessible to JavaScript.
 *
 * Trade-off: Tokens are lost on page refresh, requiring a
 * silent re-authentication via the httpOnly refresh cookie.
 */

/** In-memory token store -- never exposed to JS-accessible storage */
let accessToken: string | null = null;

export const TokenManager = {
  /**
   * Store JWT access token in memory
   * Does NOT use localStorage (XSS protection)
   */
  setToken(token: string): void {
    accessToken = token;
  },

  /**
   * Retrieve JWT access token from memory
   * @returns Token string or null if not found
   */
  getToken(): string | null {
    return accessToken;
  },

  /**
   * Remove JWT access token from memory
   */
  clearToken(): void {
    accessToken = null;
  },

  /**
   * Check if access token exists in memory
   * @returns true if token exists, false otherwise
   */
  hasToken(): boolean {
    return accessToken !== null;
  },
};
