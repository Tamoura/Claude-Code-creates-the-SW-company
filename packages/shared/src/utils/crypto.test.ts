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
} from './crypto';

describe('hashPassword', () => {
  it('produces a bcrypt hash', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('different calls produce different hashes', async () => {
    const hash1 = await hashPassword('mypassword');
    const hash2 = await hashPassword('mypassword');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correctpassword');
    const result = await verifyPassword('correctpassword', hash);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correctpassword');
    const result = await verifyPassword('wrongpassword', hash);
    expect(result).toBe(false);
  });
});

describe('hashApiKey', () => {
  it('with HMAC secret returns consistent HMAC hash', () => {
    const secret = 'test-hmac-secret';
    const apiKey = 'sk_live_abc123';
    const hash1 = hashApiKey(apiKey, secret);
    const hash2 = hashApiKey(apiKey, secret);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('without secret in non-production falls back to SHA-256', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.API_KEY_HMAC_SECRET;
    delete process.env.API_KEY_HMAC_SECRET;
    process.env.NODE_ENV = 'development';

    const apiKey = 'sk_live_abc123';
    const hash = hashApiKey(apiKey);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    process.env.NODE_ENV = originalEnv;
    if (originalSecret !== undefined) {
      process.env.API_KEY_HMAC_SECRET = originalSecret;
    }
  });

  it('in production without secret throws', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.API_KEY_HMAC_SECRET;
    delete process.env.API_KEY_HMAC_SECRET;
    process.env.NODE_ENV = 'production';

    expect(() => hashApiKey('sk_live_abc123')).toThrow(
      'API_KEY_HMAC_SECRET is required in production'
    );

    process.env.NODE_ENV = originalEnv;
    if (originalSecret !== undefined) {
      process.env.API_KEY_HMAC_SECRET = originalSecret;
    }
  });
});

describe('generateApiKey', () => {
  it('returns key with default prefix sk_live_', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^sk_live_/);
  });

  it('returns key with custom prefix', () => {
    const key = generateApiKey('sk_test');
    expect(key).toMatch(/^sk_test_/);
  });

  it('key is 72 chars (prefix 7 + _ + 64 hex) for default prefix', () => {
    const key = generateApiKey();
    // 'sk_live' = 7 chars, '_' = 1 char, 64 hex chars = 72 total
    expect(key.length).toBe(72);
  });
});

describe('getApiKeyPrefix', () => {
  it('returns first 16 chars + "..."', () => {
    const apiKey = 'test_key_abcdefghijklmnopqrstuvwxyz1234567890';
    const prefix = getApiKeyPrefix(apiKey);
    expect(prefix).toBe(apiKey.substring(0, 16) + '...');
  });
});

describe('generateWebhookSecret', () => {
  it('starts with whsec_', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_/);
  });

  it('is 70 chars (6 prefix + 64 hex)', () => {
    const secret = generateWebhookSecret();
    expect(secret.length).toBe(70);
  });
});

describe('signWebhookPayload', () => {
  it('produces consistent HMAC for same inputs', () => {
    const payload = '{"event":"test"}';
    const secret = 'whsec_testsecret';
    const timestamp = 1700000000;

    const sig1 = signWebhookPayload(payload, secret, timestamp);
    const sig2 = signWebhookPayload(payload, secret, timestamp);
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('different payloads produce different signatures', () => {
    const secret = 'whsec_testsecret';
    const timestamp = 1700000000;

    const sig1 = signWebhookPayload('{"event":"a"}', secret, timestamp);
    const sig2 = signWebhookPayload('{"event":"b"}', secret, timestamp);
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifyWebhookSignature', () => {
  const payload = '{"event":"test"}';
  const secret = 'whsec_testsecret';
  const timestamp = 1700000000;

  it('returns true for valid signature', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    const result = verifyWebhookSignature(payload, signature, secret, timestamp);
    expect(result).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const result = verifyWebhookSignature(
      payload,
      'a'.repeat(64),
      secret,
      timestamp
    );
    expect(result).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    const result = verifyWebhookSignature(payload, signature, 'wrong_secret', timestamp);
    expect(result).toBe(false);
  });

  it('returns false for wrong timestamp', () => {
    const signature = signWebhookPayload(payload, secret, timestamp);
    const result = verifyWebhookSignature(payload, signature, secret, timestamp + 1);
    expect(result).toBe(false);
  });
});

describe('generatePrefixedId', () => {
  it('uses given prefix', () => {
    const id = generatePrefixedId('txn');
    expect(id).toMatch(/^txn_/);
  });

  it('default 16 bytes = 32 hex chars', () => {
    const id = generatePrefixedId('txn');
    const hexPart = id.split('_')[1];
    expect(hexPart.length).toBe(32);
    expect(hexPart).toMatch(/^[a-f0-9]{32}$/);
  });
});
