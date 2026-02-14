import { TokenManager } from './token-manager';

describe('TokenManager', () => {
  beforeEach(() => {
    TokenManager.clearToken();
  });

  describe('initial state', () => {
    it('initially has no token (getToken returns null)', () => {
      expect(TokenManager.getToken()).toBeNull();
    });

    it('initially hasToken returns false', () => {
      expect(TokenManager.hasToken()).toBe(false);
    });
  });

  describe('setToken', () => {
    it('stores the token', () => {
      TokenManager.setToken('test-access-token');
      expect(TokenManager.getToken()).toBe('test-access-token');
    });

    it('hasToken returns true after setToken', () => {
      TokenManager.setToken('test-access-token');
      expect(TokenManager.hasToken()).toBe(true);
    });
  });

  describe('getToken', () => {
    it('returns the stored token', () => {
      TokenManager.setToken('my-jwt-token-123');
      expect(TokenManager.getToken()).toBe('my-jwt-token-123');
    });
  });

  describe('clearToken', () => {
    it('removes the token', () => {
      TokenManager.setToken('test-access-token');
      TokenManager.clearToken();
      expect(TokenManager.getToken()).toBeNull();
    });

    it('hasToken returns false after clearToken', () => {
      TokenManager.setToken('test-access-token');
      TokenManager.clearToken();
      expect(TokenManager.hasToken()).toBe(false);
    });
  });

  describe('token replacement', () => {
    it('can replace token with a new one', () => {
      TokenManager.setToken('first-token');
      expect(TokenManager.getToken()).toBe('first-token');

      TokenManager.setToken('second-token');
      expect(TokenManager.getToken()).toBe('second-token');
    });
  });

  describe('multiple set/clear cycles', () => {
    it('works correctly across multiple set/clear cycles', () => {
      // Cycle 1
      TokenManager.setToken('token-cycle-1');
      expect(TokenManager.hasToken()).toBe(true);
      expect(TokenManager.getToken()).toBe('token-cycle-1');
      TokenManager.clearToken();
      expect(TokenManager.hasToken()).toBe(false);
      expect(TokenManager.getToken()).toBeNull();

      // Cycle 2
      TokenManager.setToken('token-cycle-2');
      expect(TokenManager.hasToken()).toBe(true);
      expect(TokenManager.getToken()).toBe('token-cycle-2');
      TokenManager.clearToken();
      expect(TokenManager.hasToken()).toBe(false);
      expect(TokenManager.getToken()).toBeNull();

      // Cycle 3
      TokenManager.setToken('token-cycle-3');
      expect(TokenManager.hasToken()).toBe(true);
      expect(TokenManager.getToken()).toBe('token-cycle-3');
      TokenManager.clearToken();
      expect(TokenManager.hasToken()).toBe(false);
      expect(TokenManager.getToken()).toBeNull();
    });
  });
});
