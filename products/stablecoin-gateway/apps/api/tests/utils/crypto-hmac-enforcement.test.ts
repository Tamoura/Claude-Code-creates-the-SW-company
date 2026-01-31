/**
 * Crypto HMAC Enforcement Tests
 *
 * Verifies that hashApiKey() throws in production when
 * API_KEY_HMAC_SECRET is not configured, instead of
 * silently falling back to unsalted SHA-256.
 */

import * as crypto from 'crypto';

// We need to test the module with different env states, so we
// re-require it in each test to pick up the changed env.
describe('hashApiKey HMAC Enforcement', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('should use HMAC-SHA256 when secret is available', () => {
    process.env.API_KEY_HMAC_SECRET = 'test-hmac-secret';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hashApiKey } = require('../../src/utils/crypto');

    const hash = hashApiKey('sk_live_test123');
    const expected = crypto
      .createHmac('sha256', 'test-hmac-secret')
      .update('sk_live_test123')
      .digest('hex');

    expect(hash).toBe(expected);
  });

  it('should fall back to SHA-256 in dev/test when secret is missing', () => {
    delete process.env.API_KEY_HMAC_SECRET;
    process.env.NODE_ENV = 'test';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hashApiKey } = require('../../src/utils/crypto');

    const hash = hashApiKey('sk_live_test123');
    const expected = crypto
      .createHash('sha256')
      .update('sk_live_test123')
      .digest('hex');

    expect(hash).toBe(expected);
  });

  it('should throw in production when HMAC secret is missing', () => {
    delete process.env.API_KEY_HMAC_SECRET;
    process.env.NODE_ENV = 'production';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hashApiKey } = require('../../src/utils/crypto');

    expect(() => hashApiKey('sk_live_test123')).toThrow(
      'API_KEY_HMAC_SECRET must be configured in production'
    );
  });
});
