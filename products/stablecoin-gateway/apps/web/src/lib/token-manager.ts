/**
 * Token Manager
 *
 * Manages JWT authentication tokens in localStorage.
 * Provides a centralized interface for token storage and retrieval.
 */

const TOKEN_KEY = 'auth_token';

export const TokenManager = {
  /**
   * Store JWT token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Retrieve JWT token from localStorage
   * @returns Token string or null if not found
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Remove JWT token from localStorage
   */
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Check if token exists
   * @returns true if token exists, false otherwise
   */
  hasToken(): boolean {
    return this.getToken() !== null;
  },
};
