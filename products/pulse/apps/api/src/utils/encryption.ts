/**
 * Encryption utilities for sensitive data at rest.
 * Uses AES-256-GCM for authenticated encryption of
 * GitHub OAuth tokens and other secrets.
 *
 * ENCRYPTION_KEY must be a 64-character hex string (32 bytes).
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment.
 * Returns null if not configured (graceful degradation).
 */
function getKey(): Buffer | null {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 64) {
    return null;
  }
  return Buffer.from(keyHex.slice(0, 64), 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a combined string: iv:authTag:ciphertext (all hex-encoded).
 *
 * If ENCRYPTION_KEY is not configured, throws an error.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY not configured. Cannot encrypt sensitive data.'
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a token that was encrypted with encryptToken().
 * Expects format: iv:authTag:ciphertext (all hex-encoded).
 *
 * Throws on invalid input, wrong key, or tampered data.
 */
export function decryptToken(encryptedValue: string): string {
  const key = getKey();
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY not configured. Cannot decrypt sensitive data.'
    );
  }

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a value appears to be encrypted (has the iv:tag:data format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  // Check that each part is valid hex
  const hexPattern = /^[0-9a-f]+$/i;
  return parts.every((p) => hexPattern.test(p));
}
