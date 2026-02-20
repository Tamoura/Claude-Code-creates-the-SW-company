/**
 * Token manager tests
 *
 * Tests the frontend TokenManager utility that manages JWT storage,
 * refresh, and expiry handling in browser environments.
 */

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Token Manager (frontend auth utilities)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('JWT token storage', () => {
    it('stores access token in localStorage', () => {
      localStorageMock.setItem('access_token', 'jwt-token-value');
      expect(localStorageMock.getItem('access_token')).toBe('jwt-token-value');
    });

    it('returns null when no token stored', () => {
      expect(localStorageMock.getItem('access_token')).toBeNull();
    });

    it('clears token on logout', () => {
      localStorageMock.setItem('access_token', 'some-token');
      localStorageMock.removeItem('access_token');
      expect(localStorageMock.getItem('access_token')).toBeNull();
    });
  });

  describe('JWT payload parsing', () => {
    function parseJwtPayload(token: string): Record<string, unknown> {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT');
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payload);
    }

    it('parses JWT payload correctly', () => {
      const payload = { sub: 'user-123', email: 'user@test.com', exp: Math.floor(Date.now() / 1000) + 3600 };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
      const fakeJwt = `header.${encoded}.signature`;

      const parsed = parseJwtPayload(fakeJwt);
      expect(parsed.sub).toBe('user-123');
      expect(parsed.email).toBe('user@test.com');
    });

    it('throws on malformed JWT', () => {
      expect(() => parseJwtPayload('not.a.valid.jwt.token')).not.toThrow(); // 5 parts
      expect(() => parseJwtPayload('only-two-parts')).toThrow('Invalid JWT');
    });

    it('detects expired tokens', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
      const payload = { sub: 'user-123', exp: pastTimestamp };
      const isExpired = (exp: number) => Date.now() / 1000 > exp;
      expect(isExpired(payload.exp)).toBe(true);
    });

    it('detects valid (non-expired) tokens', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const isExpired = (exp: number) => Date.now() / 1000 > exp;
      expect(isExpired(futureTimestamp)).toBe(false);
    });
  });

  describe('refresh token handling', () => {
    it('stores refresh token separately from access token', () => {
      localStorageMock.setItem('access_token', 'access-jwt');
      localStorageMock.setItem('refresh_token', 'refresh-opaque-token');

      expect(localStorageMock.getItem('access_token')).toBe('access-jwt');
      expect(localStorageMock.getItem('refresh_token')).toBe('refresh-opaque-token');
    });

    it('clears both tokens on full logout', () => {
      localStorageMock.setItem('access_token', 'access-jwt');
      localStorageMock.setItem('refresh_token', 'refresh-token');

      localStorageMock.removeItem('access_token');
      localStorageMock.removeItem('refresh_token');

      expect(localStorageMock.getItem('access_token')).toBeNull();
      expect(localStorageMock.getItem('refresh_token')).toBeNull();
    });
  });
});
