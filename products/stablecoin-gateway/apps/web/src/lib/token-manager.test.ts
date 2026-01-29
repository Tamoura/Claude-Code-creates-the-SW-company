import { describe, it, expect, beforeEach } from 'vitest';
import { TokenManager } from './token-manager';

/**
 * Token Manager Tests
 *
 * Verifies that the TokenManager uses memory-only storage for
 * access tokens instead of localStorage. This prevents XSS
 * attacks from stealing JWT tokens.
 */
describe('TokenManager', () => {
  beforeEach(() => {
    TokenManager.clearToken();
  });

  it('should store and retrieve access token in memory', () => {
    TokenManager.setToken('test-access-token');
    expect(TokenManager.getToken()).toBe('test-access-token');
  });

  it('should return null when no token is set', () => {
    expect(TokenManager.getToken()).toBeNull();
  });

  it('should clear the token from memory', () => {
    TokenManager.setToken('test-token');
    TokenManager.clearToken();
    expect(TokenManager.getToken()).toBeNull();
  });

  it('should report hasToken correctly', () => {
    expect(TokenManager.hasToken()).toBe(false);
    TokenManager.setToken('test-token');
    expect(TokenManager.hasToken()).toBe(true);
    TokenManager.clearToken();
    expect(TokenManager.hasToken()).toBe(false);
  });

  it('should NOT use localStorage (memory-only for XSS protection)', () => {
    // Verify localStorage is not used
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    TokenManager.setToken('secret-token');
    TokenManager.getToken();
    TokenManager.clearToken();

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('should overwrite previous token when setToken is called again', () => {
    TokenManager.setToken('first-token');
    TokenManager.setToken('second-token');
    expect(TokenManager.getToken()).toBe('second-token');
  });
});
