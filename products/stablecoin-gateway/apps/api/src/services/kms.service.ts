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

  // Delegate signing to KMSSigningService
  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    return this.signingService.signTransaction(transaction);
  }

  async sign(messageHash: string): Promise<ethers.Signature> {
    return this.signingService.sign(messageHash);
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
