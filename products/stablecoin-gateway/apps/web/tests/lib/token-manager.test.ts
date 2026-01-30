/**
 * Token Manager Tests
 *
 * Tests for secure in-memory token storage and retrieval.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenManager } from '../../src/lib/token-manager';

describe('TokenManager', () => {
  beforeEach(() => {
    TokenManager.clearToken();
  });

  describe('setToken', () => {
    it('should store token', () => {
      const token = 'test_jwt_token_12345';
      TokenManager.setToken(token);

      expect(TokenManager.getToken()).toBe(token);
    });

    it('should overwrite existing token', () => {
      TokenManager.setToken('old_token');
      TokenManager.setToken('new_token');

      expect(TokenManager.getToken()).toBe('new_token');
    });
  });

  describe('getToken', () => {
    it('should return token when present', () => {
      const token = 'test_jwt_token_12345';
      TokenManager.setToken(token);

      expect(TokenManager.getToken()).toBe(token);
    });

    it('should return null when no token exists', () => {
      expect(TokenManager.getToken()).toBeNull();
    });
  });

  describe('clearToken', () => {
    it('should remove token', () => {
      TokenManager.setToken('test_token');
      expect(TokenManager.getToken()).toBe('test_token');

      TokenManager.clearToken();
      expect(TokenManager.getToken()).toBeNull();
    });

    it('should not throw error when no token exists', () => {
      expect(() => TokenManager.clearToken()).not.toThrow();
    });
  });

  describe('hasToken', () => {
    it('should return true when token exists', () => {
      TokenManager.setToken('test_token');
      expect(TokenManager.hasToken()).toBe(true);
    });

    it('should return false when no token exists', () => {
      expect(TokenManager.hasToken()).toBe(false);
    });
  });
});
