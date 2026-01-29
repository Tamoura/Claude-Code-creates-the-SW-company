/**
 * Token Manager Tests
 *
 * Tests for secure token storage and retrieval
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '../../src/lib/token-manager';

describe('TokenManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('setToken', () => {
    it('should store token in localStorage', () => {
      const token = 'test_jwt_token_12345';
      TokenManager.setToken(token);

      expect(localStorage.getItem('auth_token')).toBe(token);
    });

    it('should overwrite existing token', () => {
      TokenManager.setToken('old_token');
      TokenManager.setToken('new_token');

      expect(localStorage.getItem('auth_token')).toBe('new_token');
    });
  });

  describe('getToken', () => {
    it('should return token when present', () => {
      const token = 'test_jwt_token_12345';
      localStorage.setItem('auth_token', token);

      expect(TokenManager.getToken()).toBe(token);
    });

    it('should return null when no token exists', () => {
      expect(TokenManager.getToken()).toBeNull();
    });
  });

  describe('clearToken', () => {
    it('should remove token from localStorage', () => {
      TokenManager.setToken('test_token');
      expect(localStorage.getItem('auth_token')).toBe('test_token');

      TokenManager.clearToken();
      expect(localStorage.getItem('auth_token')).toBeNull();
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
