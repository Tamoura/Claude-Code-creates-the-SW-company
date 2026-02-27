/**
 * AWS KMS Service
 *
 * Key management, address derivation, health checks, and key rotation.
 * Delegates signing operations to KMSSigningService.
 *
 * Security:
 * - Private keys never leave AWS KMS
 * - All signing operations occur within KMS
 * - Supports key rotation and audit logging
 */

import { KMSClient, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';
import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { KMSSigningService, sanitizeKmsError } from './kms-signing.service.js';

interface KMSConfig {
  keyId: string;
  region?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * ADR: AWS KMS for Blockchain Key Management
 *
 * AWS KMS is used so that private signing keys never leave the
 * Hardware Security Module (HSM). In a traditional setup, the
 * merchant wallet private key lives in an environment variable or
 * config file, meaning any server compromise, memory dump, or log
 * leak exposes the key and allows unlimited fund drainage. With
 * KMS, the key is generated inside the HSM and all signing
 * operations execute within KMS -- the application only ever
 * receives the signature output, never the raw key material.
 *
 * Recovery parameter (v value) calculation is required because AWS
 * KMS returns a standard DER-encoded ECDSA signature (r, s) without
 * the Ethereum-specific recovery parameter. EVM transactions and
 * ecrecover require v (27 or 28) to recover the signer's public key
 * from the signature. The service tries both values and compares the
 * recovered address against the known KMS public key address to
 * determine the correct v. This is a standard technique when using
 * non-Ethereum-native HSMs for EVM signing.
 *
 * Health checks verify both sign and getPublicKey operations because
 * they exercise different KMS permissions and code paths. A key can
 * be accessible for public key retrieval (kms:GetPublicKey) but have
 * its signing permission revoked (kms:Sign), or vice versa. Checking
 * only one operation would give a false positive if the other is
 * broken. The health check validates the full operational path that
 * a real refund transaction would exercise.
 *
 * Alternatives considered:
 * - Local private key in env var: Rejected for production because
 *   any process with memory access can extract the key.
 * - HashiCorp Vault transit engine: Viable alternative, but adds
 *   another infrastructure dependency; AWS KMS is native to our
 *   deployment environment and provides FIPS 140-2 Level 3 HSMs.
 * - Fireblocks / institutional custody: Rejected for MVP due to
 *   cost and integration complexity; KMS provides sufficient
 *   security for current transaction volumes.
 */
export class KMSService {
  private client: KMSClient;
  private keyId: string;
  private publicKeyCache: string | null = null;
  private addressCache: string | null = null;
  private maxRetries: number;
  private signingService: KMSSigningService;

  constructor(config: KMSConfig) {
    if (!config.keyId) {
      throw new AppError(500, 'kms-config-error', 'KMS Key ID is required');
    }

    this.keyId = config.keyId;
    this.maxRetries = config.maxRetries || 3;

    this.client = new KMSClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      maxAttempts: this.maxRetries,
      requestHandler: {
        requestTimeout: config.timeout || 30000,
      } as any,
    });

    this.signingService = new KMSSigningService(this.client, this.keyId, this);
  }

  /**
   * Get the Ethereum address derived from the KMS public key.
   * Result is cached after first retrieval.
   */
  async getAddress(): Promise<string> {
    if (this.addressCache) {
      return this.addressCache;
    }

    try {
      const publicKey = await this.getPublicKey();

      // Derive Ethereum address from uncompressed public key
      const publicKeyBytes = Buffer.from(publicKey.slice(4), 'hex');
      const hash = ethers.keccak256(publicKeyBytes);
      const address = ethers.getAddress('0x' + hash.slice(-40));

      this.addressCache = address;
      return address;
    } catch (error) {
      throw sanitizeKmsError(error, 'address-derivation');
    }
  }

  /**
   * Get the uncompressed public key from KMS.
   * Returns hex string with '04' prefix.
   */
  async getPublicKey(): Promise<string> {
    if (this.publicKeyCache) {
      return this.publicKeyCache;
    }

    try {
      const command = new GetPublicKeyCommand({
        KeyId: this.keyId,
      });

      const response = await this.client.send(command);

      if (!response.PublicKey) {
        throw new Error('No public key returned from KMS');
      }

      const publicKeyDer = Buffer.from(response.PublicKey);
      const publicKeyBytes = publicKeyDer.slice(-65);

      if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
        throw new Error('Invalid public key format from KMS');
      }

      const publicKey = '0x' + publicKeyBytes.toString('hex');
      this.publicKeyCache = publicKey;

      return publicKey;
    } catch (error) {
      throw sanitizeKmsError(error, 'public-key-retrieval');
    }
  }

  // Delegate signing to KMSSigningService with structured audit log
  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    try {
      const result = await this.signingService.signTransaction(transaction);
      logger.info('KMS signing audit', {
        keyId: this.keyId.substring(0, 8) + '...',
        operation: 'transaction-signing',
        outcome: 'success',
      });
      return result;
    } catch (err) {
      logger.warn('KMS signing failed', {
        keyId: this.keyId.substring(0, 8) + '...',
        operation: 'transaction-signing',
        outcome: 'failure',
        errorCode: err instanceof AppError ? err.code : 'unknown',
      });
      throw err;
    }
  }

  async sign(messageHash: string): Promise<ethers.Signature> {
    try {
      const result = await this.signingService.sign(messageHash);
      logger.info('KMS signing audit', {
        keyId: this.keyId.substring(0, 8) + '...',
        operation: 'message-signing',
        outcome: 'success',
      });
      return result;
    } catch (err) {
      logger.warn('KMS signing failed', {
        keyId: this.keyId.substring(0, 8) + '...',
        operation: 'message-signing',
        outcome: 'failure',
        errorCode: err instanceof AppError ? err.code : 'unknown',
      });
      throw err;
    }
  }

  /**
   * Return the currently active KMS key ID.
   * Used by callers that need to save the old key before rotation.
   */
  getCurrentKeyId(): string {
    return this.keyId;
  }

  /**
   * Clear cached values (useful for key rotation)
   */
  clearCache(): void {
    this.publicKeyCache = null;
    this.addressCache = null;
  }

  /**
   * Rotate to a new KMS key.
   */
  rotateKey(newKeyId: string): void {
    logger.warn('KMS key rotation initiated', {
      oldKeyId: this.keyId.substring(0, 8) + '...',
      newKeyId: newKeyId.substring(0, 8) + '...',
    });
    this.keyId = newKeyId;
    this.clearCache();
    this.signingService = new KMSSigningService(this.client, this.keyId, this);
  }

  /**
   * Health check: verify the current KMS key is accessible.
   */
  async isKeyHealthy(): Promise<boolean> {
    try {
      await this.getPublicKey();
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      await this.getPublicKey();
      return { status: 'healthy', message: 'KMS connection successful' };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Factory function to create KMS service from environment variables
 */
export function createKMSService(): KMSService {
  const keyId = process.env.KMS_KEY_ID || process.env.AWS_KMS_KEY_ID;

  if (!keyId) {
    throw new AppError(
      500,
      'kms-not-configured',
      'KMS_KEY_ID environment variable is required'
    );
  }

  return new KMSService({
    keyId,
    region: process.env.AWS_REGION,
    maxRetries: parseInt(process.env.KMS_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.KMS_TIMEOUT || '30000', 10),
  });
}
