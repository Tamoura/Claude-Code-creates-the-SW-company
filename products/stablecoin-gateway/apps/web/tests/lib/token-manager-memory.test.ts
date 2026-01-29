/**
 * Token Manager In-Memory Storage Tests
 *
 * Verifies that the TokenManager uses in-memory storage
 * instead of localStorage to prevent XSS token theft.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenManager } from '../../src/lib/token-manager';

describe('TokenManager in-memory storage', () => {
  beforeEach(() => {
    TokenManager.clearToken();
  });

  it('should store token in memory, not localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    TokenManager.setToken('test_jwt_token_12345');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(TokenManager.getToken()).toBe('test_jwt_token_12345');

    setItemSpy.mockRestore();
  });

  it('should retrieve token from memory, not localStorage', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    TokenManager.setToken('memory_token');
    const token = TokenManager.getToken();

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(token).toBe('memory_token');

    getItemSpy.mockRestore();
  });

  it('should return null after clearToken', () => {
    TokenManager.setToken('token_to_clear');
    expect(TokenManager.getToken()).toBe('token_to_clear');

    TokenManager.clearToken();
    expect(TokenManager.getToken()).toBeNull();
  });

  it('should report hasToken correctly', () => {
    expect(TokenManager.hasToken()).toBe(false);

    TokenManager.setToken('has_token_test');
    expect(TokenManager.hasToken()).toBe(true);

    TokenManager.clearToken();
    expect(TokenManager.hasToken()).toBe(false);
  });

  it('should never call localStorage.setItem', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    TokenManager.setToken('first_token');
    TokenManager.setToken('second_token');
    TokenManager.clearToken();
    TokenManager.setToken('third_token');

    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it('should never call localStorage.getItem', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    TokenManager.setToken('get_test');
    TokenManager.getToken();
    TokenManager.hasToken();

    expect(getItemSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
  });

  it('should never call localStorage.removeItem', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    TokenManager.setToken('remove_test');
    TokenManager.clearToken();

    expect(removeItemSpy).not.toHaveBeenCalled();

    removeItemSpy.mockRestore();
  });

  it('should overwrite previous token on re-set', () => {
    TokenManager.setToken('old_token');
    TokenManager.setToken('new_token');

    expect(TokenManager.getToken()).toBe('new_token');
  });
});
