import {
  hashPassword,
  verifyPassword,
  hashApiKey,
  generateApiKey,
  getApiKeyPrefix,
  generateWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
  generatePrefixedId,
} from '../src/utils/crypto';

describe('hashPassword / verifyPassword', () => {
  it('hashes a password and verifies it correctly', async () => {
    const password = 'SuperSecret123!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});

describe('hashApiKey', () => {
  it('produces a hex string hash', () => {
    const hash = hashApiKey('sk_live_test_key', 'test-secret');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent hash with same secret', () => {
    const hash1 = hashApiKey('my_api_key', 'my-secret');
    const hash2 = hashApiKey('my_api_key', 'my-secret');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different keys', () => {
    const hash1 = hashApiKey('key-one', 'secret');
    const hash2 = hashApiKey('key-two', 'secret');
    expect(hash1).not.toBe(hash2);
  });

  it('uses SHA-256 fallback in non-production without secret', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const hash = hashApiKey('test_key');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    process.env.NODE_ENV = original;
  });
});

describe('generateApiKey', () => {
  it('generates a key with default prefix', () => {
    const key = generateApiKey();
    expect(key.startsWith('sk_live_')).toBe(true);
  });

  it('generates a key with custom prefix', () => {
    const key = generateApiKey('sk_test');
    expect(key.startsWith('sk_test_')).toBe(true);
  });

  it('generates unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });

  it('generates a key of expected length', () => {
    const key = generateApiKey('prefix');
    // prefix_ + 64 hex chars (32 bytes)
    expect(key.length).toBeGreaterThan(60);
  });
});

describe('getApiKeyPrefix', () => {
  it('returns masked prefix with ellipsis', () => {
    const key = 'sk_live_abcdef1234567890';
    const prefix = getApiKeyPrefix(key);
    expect(prefix).toBe('sk_live_abcdef1...');
    expect(prefix.endsWith('...')).toBe(true);
  });
});

describe('generateWebhookSecret', () => {
  it('generates a whsec_ prefixed secret', () => {
    const secret = generateWebhookSecret();
    expect(secret.startsWith('whsec_')).toBe(true);
  });

  it('generates unique secrets', () => {
    const s1 = generateWebhookSecret();
    const s2 = generateWebhookSecret();
    expect(s1).not.toBe(s2);
  });
});

describe('signWebhookPayload / verifyWebhookSignature', () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ event: 'payment.completed', id: 'pay_123' });
  const timestamp = Date.now();

  it('produces a verifiable signature', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    expect(verifyWebhookSignature(payload, signature, secret, timestamp)).toBe(true);
  });

  it('fails verification with wrong secret', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    expect(verifyWebhookSignature(payload, signature, 'wrong-secret', timestamp)).toBe(false);
  });

  it('fails verification with tampered payload', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    const tampered = JSON.stringify({ event: 'payment.failed', id: 'pay_123' });
    expect(verifyWebhookSignature(tampered, signature, secret, timestamp)).toBe(false);
  });

  it('fails verification with wrong timestamp', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    expect(verifyWebhookSignature(payload, signature, secret, timestamp + 1000)).toBe(false);
  });
});

describe('generatePrefixedId', () => {
  it('generates ID with specified prefix', () => {
    const id = generatePrefixedId('pay');
    expect(id.startsWith('pay_')).toBe(true);
  });

  it('generates unique IDs', () => {
    const id1 = generatePrefixedId('tx');
    const id2 = generatePrefixedId('tx');
    expect(id1).not.toBe(id2);
  });
});
