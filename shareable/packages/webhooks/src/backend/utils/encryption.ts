/**
 * AES-256-GCM encryption for webhook secrets at rest.
 *
 * Webhook secrets must be recoverable (unlike passwords) because
 * we need the plaintext to compute HMAC signatures when delivering.
 * AES-256-GCM provides authenticated encryption (tamper detection).
 *
 * In production, WEBHOOK_ENCRYPTION_KEY is mandatory.
 * In dev/test, plaintext fallback is allowed.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let encryptionKey: Buffer | null = null;

/**
 * Initialize encryption with a hex key (64 hex chars = 32 bytes for AES-256).
 * Call once at app startup.
 */
export function initializeEncryption(keyHex?: string): void {
  const keyString = keyHex || process.env.WEBHOOK_ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY is required for webhook secret encryption');
  }

  if (keyString.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyString)) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
  }

  const uniqueChars = new Set(keyString.toLowerCase()).size;
  if (uniqueChars < 8) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY has insufficient entropy');
  }

  encryptionKey = Buffer.from(keyString, 'hex');
}

function ensureInitialized(): void {
  if (!encryptionKey) {
    throw new Error('Encryption not initialized — call initializeEncryption() at startup');
  }
}

export function encryptSecret(plaintext: string): string {
  ensureInitialized();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey!, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(encryptedData: string): string {
  ensureInitialized();

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  if (iv.length !== IV_LENGTH) throw new Error(`Invalid IV length: expected ${IV_LENGTH}`);
  if (authTag.length !== AUTH_TAG_LENGTH) throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}`);

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey!, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encrypt secret for storage with production enforcement.
 * In dev/test without a key, returns plaintext.
 */
export function encryptSecretForStorage(secret: string): string {
  if (process.env.NODE_ENV === 'production' && !process.env.WEBHOOK_ENCRYPTION_KEY) {
    throw new Error('Webhook encryption key is required in production');
  }

  return process.env.WEBHOOK_ENCRYPTION_KEY ? encryptSecret(secret) : secret;
}
