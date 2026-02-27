/**
 * KMS Signer Service
 *
 * Provides a SignerProvider abstraction to remove direct private key
 * access from environment variables in production.
 *
 * Security:
 * - In production (USE_KMS=true): uses AWS KMS via KMSService
 * - In development (USE_KMS=false): falls back to env var with warning
 * - Production mode (NODE_ENV=production) BLOCKS raw key usage
 * - Private keys are NEVER logged
 *
 * Environment Variables:
 * - USE_KMS: 'true' to use AWS KMS, 'false' for env var fallback
 * - KMS_KEY_ID or AWS_KMS_KEY_ID: AWS KMS key identifier (required if USE_KMS=true)
 * - MERCHANT_WALLET_PRIVATE_KEY: Fallback private key (dev only)
 */

import { ethers } from 'ethers';
import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { createKMSService, KMSService } from './kms.service.js';

export type Network = 'polygon' | 'ethereum';

/**
 * Interface for wallet/signer providers.
 * Both KMS and env var providers implement this.
 */
export interface SignerProvider {
  getWallet(network: Network): Promise<ethers.Wallet | KMSWalletAdapter>;
}

/**
 * Adapter that wraps KMSService to provide a wallet-like interface
 * for use in blockchain transaction service.
 */
export class KMSWalletAdapter {
  public readonly address: string;
  private kmsService: KMSService;

  constructor(address: string, kmsService: KMSService) {
    this.address = address;
    this.kmsService = kmsService;
  }

  connect(_provider: ethers.JsonRpcProvider): KMSWalletAdapter {
    return this;
  }

  getKMSService(): KMSService {
    return this.kmsService;
  }
}

/**
 * KMS-based signer provider for production use.
 * Private keys never leave AWS KMS.
 */
export class KMSSignerProvider implements SignerProvider {
  private kmsService: KMSService;

  constructor() {
    this.kmsService = createKMSService();
    logger.info('KMSSignerProvider initialized', {
      provider: 'AWS KMS',
    });
  }

  async getWallet(_network: Network): Promise<KMSWalletAdapter> {
    const address = await this.kmsService.getAddress();
    return new KMSWalletAdapter(address, this.kmsService);
  }
}

/**
 * Environment variable-based signer provider.
 * Only allowed in non-production environments.
 * Logs a warning on every use.
 */
export class EnvVarSignerProvider implements SignerProvider {
  constructor() {
    logger.info('EnvVarSignerProvider initialized', {
      provider: 'environment variable',
    });
  }

  async getWallet(network: Network): Promise<ethers.Wallet> {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(
        500,
        'kms-not-configured',
        'Raw private key in env vars not allowed in production. Set USE_KMS=true'
      );
    }

    logger.warn(
      'WARNING: Using raw private key from env var. NOT SAFE FOR PRODUCTION.',
      { network }
    );

    const key = process.env.MERCHANT_WALLET_PRIVATE_KEY;
    if (!key) {
      throw new Error('MERCHANT_WALLET_PRIVATE_KEY not configured');
    }

    // Create wallet without logging the key
    return new ethers.Wallet(key);
  }
}

/**
 * Factory function to create the appropriate signer provider
 * based on the USE_KMS environment variable.
 *
 * Startup guard: throws immediately in production when USE_KMS is not 'true'
 * so the application refuses to start rather than failing on first payment.
 */
export function createSignerProvider(): SignerProvider {
  if (process.env.USE_KMS === 'true') {
    return new KMSSignerProvider();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new AppError(
      500,
      'kms-not-configured',
      'KMS is required in production. Set USE_KMS=true and KMS_KEY_ID.'
    );
  }

  return new EnvVarSignerProvider();
}
