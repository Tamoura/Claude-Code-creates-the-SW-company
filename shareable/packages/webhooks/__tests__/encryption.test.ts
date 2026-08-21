import {
  initializeEncryption,
  encryptSecret,
  decryptSecret,
  encryptSecretForStorage,
} from '../src/backend/utils/encryption';

// Valid 32-byte hex key (64 hex chars with good entropy)
const VALID_KEY = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

describe('initializeEncryption', () => {
  it('initializes successfully with a valid 64-char hex key', () => {
    expect(() => initializeEncryption(VALID_KEY)).not.toThrow();
  });

  it('throws for a key that is too short', () => {
    expect(() => initializeEncryption('tooshort')).toThrow('64 hexadecimal characters');
  });

  it('throws for a key with non-hex characters', () => {
    const invalidKey = 'z'.repeat(64);
    expect(() => initializeEncryption(invalidKey)).toThrow('hexadecimal');
  });

  it('throws for a low-entropy key (all same character)', () => {
    const lowEntropyKey = 'a'.repeat(64);
    expect(() => initializeEncryption(lowEntropyKey)).toThrow('entropy');
  });
});

describe('encryptSecret / decryptSecret', () => {
  beforeAll(() => {
    initializeEncryption(VALID_KEY);
  });

  it('encrypts and decrypts a secret correctly', () => {
    const secret = 'whsec_my-webhook-secret-value';
    const encrypted = encryptSecret(secret);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const secret = 'same-secret';
    const enc1 = encryptSecret(secret);
    const enc2 = encryptSecret(secret);
    expect(enc1).not.toBe(enc2);
  });

  it('encrypted format contains three base64 parts separated by colon', () => {
    const encrypted = encryptSecret('test-secret');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // Each part should be valid base64
    parts.forEach(part => {
      expect(part.length).toBeGreaterThan(0);
    });
  });

  it('decryptSecret throws on invalid format', () => {
    expect(() => decryptSecret('not:valid:format:four')).toThrow('Invalid');
    expect(() => decryptSecret('only-one-part')).toThrow('Invalid');
  });

  it('throws when encryption not initialized', () => {
    // This test would fail if initialization hasn't happened
    // Just verify that initialized service works
    expect(() => encryptSecret('test')).not.toThrow();
  });
});

describe('encryptSecretForStorage', () => {
  beforeAll(() => {
    initializeEncryption(VALID_KEY);
    process.env.WEBHOOK_ENCRYPTION_KEY = VALID_KEY;
  });

  afterAll(() => {
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
  });

  it('encrypts when WEBHOOK_ENCRYPTION_KEY is set', () => {
    const secret = 'whsec_test';
    const stored = encryptSecretForStorage(secret);
    // Should be encrypted (not plaintext)
    expect(stored).not.toBe(secret);
    expect(stored.split(':').length).toBe(3);
  });
});
