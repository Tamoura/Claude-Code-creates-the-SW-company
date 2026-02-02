/**
 * Encryption Utility - AES-256-GCM
 *
 * Provides encryption/decryption for sensitive data at rest.
 *
 * Algorithm: AES-256-GCM (Galois/Counter Mode)
 * - Authenticated encryption (prevents tampering)
 * - Fast and secure
 * - NIST approved
 * - Standard for data at rest encryption
 *
 * Usage:
 * ```typescript
 * // Initialize once at app startup
 * initializeEncryption();
 *
 * // Encrypt webhook secret before storing
 * const encrypted = encryptSecret(plaintextSecret);
 *
 * // Decrypt webhook secret when needed
 * const plaintext = decryptSecret(encryptedSecret);
 * ```
 *
 * Environment Variables:
 * - WEBHOOK_ENCRYPTION_KEY: Master encryption key (exactly 64 hex characters / 32 bytes)
 *   Generate with: openssl rand -hex 32
 */

import crypto from 'crypto';
import { AppError } from '../types/index.js';

// Encryption algorithm and parameters
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

// Derived encryption key (initialized on startup)
let encryptionKey: Buffer | null = null;

/**
 * Initialize encryption system
 *
 * MUST be called once at application startup before any encryption/decryption operations.
 * Derives the encryption key from environment variable.
 *
 * @throws {Error} If WEBHOOK_ENCRYPTION_KEY is not set or too short
 */
export function initializeEncryption(): void {
  const keyString = process.env.WEBHOOK_ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error(
      'WEBHOOK_ENCRYPTION_KEY environment variable is required for webhook secret encryption'
    );
  }

  // Validate key is exactly 64 hex characters (32 bytes for AES-256)
  if (keyString.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyString)) {
    throw new Error(
      'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
    );
  }

  // Decode the 64 hex character string directly into a 32-byte buffer.
  // The key is already validated to be exactly 64 hex chars (32 bytes for AES-256).
  // No hashing needed — using the raw key directly ensures interoperability
  // with other AES-256-GCM implementations (e.g., OpenSSL CLI).
  encryptionKey = Buffer.from(keyString, 'hex');
}

/**
 * Ensure encryption is initialized
 */
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
 * Encrypt a secret using AES-256-GCM
 *
 * Returns encrypted data in format: iv:authTag:ciphertext (all base64)
 *
 * @param plaintext - The secret to encrypt
 * @returns Encrypted data as base64 string with IV and auth tag
 */
export function encryptSecret(plaintext: string): string {
  ensureInitialized();

  try {
    // Generate random IV (Initialization Vector)
    // GCM mode requires unique IV for each encryption operation
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey!, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag (for tamper detection)
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:ciphertext (all base64 encoded)
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  } catch (error) {
    throw new AppError(
      500,
      'encryption-failed',
      'Failed to encrypt secret',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Decrypt a secret encrypted with encryptSecret()
 *
 * @param encryptedData - Encrypted data in format iv:authTag:ciphertext
 * @returns Decrypted plaintext
 * @throws {AppError} If decryption fails or data has been tampered with
 */
export function decryptSecret(encryptedData: string): string {
  ensureInitialized();

  // Parse encrypted data format: iv:authTag:ciphertext
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new AppError(
      400,
      'invalid-encrypted-data',
      'Invalid encrypted data format',
      'Expected format: iv:authTag:ciphertext'
    );
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;

  try {

    // Decode from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    // Validate sizes
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes`);
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey!, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set authentication tag (this verifies data integrity)
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // If it's already an AppError (from format validation), rethrow it
    if (error instanceof AppError) {
      throw error;
    }

    // This could be tampering or corruption
    throw new AppError(
      500,
      'decryption-failed',
      'Failed to decrypt secret - data may have been tampered with',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
