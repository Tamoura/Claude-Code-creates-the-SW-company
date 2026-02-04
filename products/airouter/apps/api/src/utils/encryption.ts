import crypto from 'crypto';
import { AppError } from '../types/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let encryptionKey: Buffer | null = null;

/**
 * Initialize encryption system for provider key vault.
 * Must be called once at startup.
 */
export function initializeEncryption(): void {
  const keyString = process.env.PROVIDER_KEY_ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error(
      'PROVIDER_KEY_ENCRYPTION_KEY environment variable is required for provider key encryption'
    );
  }

  if (keyString.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyString)) {
    throw new Error(
      'PROVIDER_KEY_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
    );
  }

  const uniqueChars = new Set(keyString.toLowerCase()).size;
  if (uniqueChars < 8) {
    throw new Error(
      'PROVIDER_KEY_ENCRYPTION_KEY has insufficient entropy. Generate with: openssl rand -hex 32'
    );
  }

  encryptionKey = Buffer.from(keyString, 'hex');
}

function ensureInitialized(): void {
  if (!encryptionKey) {
    throw new AppError(
      500,
      'encryption-not-initialized',
      'Encryption system not initialized',
      'Contact system administrator'
    );
  }
}

/**
 * Encrypt a provider API key using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all base64)
 */
export function encryptSecret(plaintext: string): string {
  ensureInitialized();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey!, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a provider API key encrypted with encryptSecret().
 */
export function decryptSecret(encryptedData: string): string {
  ensureInitialized();

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new AppError(
      400,
      'invalid-encrypted-data',
      'Invalid encrypted data format'
    );
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey!, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
