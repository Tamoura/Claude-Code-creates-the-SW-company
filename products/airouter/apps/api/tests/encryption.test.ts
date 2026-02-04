import './setup';
import { initializeEncryption, encryptSecret, decryptSecret } from '../src/utils/encryption';

describe('Encryption (AES-256-GCM)', () => {
  beforeAll(() => {
    initializeEncryption();
  });

  it('should encrypt and decrypt a secret correctly', () => {
    const original = 'sk-test-api-key-1234567890';
    const encrypted = encryptSecret(original);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for the same input (random IV)', () => {
    const original = 'same-key-same-key';
    const encrypted1 = encryptSecret(original);
    const encrypted2 = encryptSecret(original);
    expect(encrypted1).not.toBe(encrypted2);
    // But both should decrypt to the same value
    expect(decryptSecret(encrypted1)).toBe(original);
    expect(decryptSecret(encrypted2)).toBe(original);
  });

  it('should produce encrypted data in iv:authTag:ciphertext format', () => {
    const encrypted = encryptSecret('test-key');
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
    // Each part should be valid base64
    for (const part of parts) {
      expect(() => Buffer.from(part, 'base64')).not.toThrow();
    }
  });

  it('should reject invalid encrypted data format', () => {
    expect(() => decryptSecret('invalid-data')).toThrow();
  });

  it('should reject tampered ciphertext', () => {
    const encrypted = encryptSecret('my-secret-key');
    const parts = encrypted.split(':');
    // Tamper with the ciphertext
    const tampered = parts[0] + ':' + parts[1] + ':' + 'dGFtcGVyZWQ=';
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('should handle empty string encryption', () => {
    const encrypted = encryptSecret('');
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle long keys', () => {
    const longKey = 'a'.repeat(1000);
    const encrypted = encryptSecret(longKey);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(longKey);
  });
});
