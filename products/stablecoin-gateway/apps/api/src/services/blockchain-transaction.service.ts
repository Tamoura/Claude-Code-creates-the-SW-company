/**
 * Blockchain Transaction Service
 *
 * Handles execution of blockchain transactions for refunds.
 *
 * Features:
 * - ERC-20 token transfers (USDC, USDT)
 * - Gas fee estimation
 * - Transaction signing via KMS signer abstraction
 * - Multi-network support (Polygon, Ethereum)
 * - RPC provider failover with health checks
 * - Error handling and retry logic
 * - Optional nonce management via NonceManager for concurrent safety
 * - Daily spending limits to prevent unlimited fund drainage
 *
 * Security:
 * - Uses KMS signer abstraction (never reads raw private key directly)
 * - In production: AWS KMS signing (USE_KMS=true)
 * - In development: env var fallback with warning
 * - Address validation
 * - Amount validation
 * - Transaction confirmation
 * - Redis-based nonce serialization (when NonceManager provided)
 * - Per-network wallet caching (prevents cross-network wallet reuse)
 * - Daily refund spending cap via Redis (prevents unlimited drainage)
 *
 * Environment Variables:
 * - USE_KMS: 'true' for KMS signing, 'false' for env var fallback
 * - KMS_KEY_ID: AWS KMS key identifier (required if USE_KMS=true)
 * - MERCHANT_WALLET_PRIVATE_KEY: Fallback key (dev only, USE_KMS=false)
 * - POLYGON_RPC_URLS: Comma-separated Polygon RPC endpoints (failover)
 * - ETHEREUM_RPC_URLS: Comma-separated Ethereum RPC endpoints (failover)
 * - POLYGON_RPC_URL: Single Polygon RPC endpoint (backwards compatible)
 * - ETHEREUM_RPC_URL: Single Ethereum RPC endpoint (backwards compatible)
 * - DAILY_REFUND_LIMIT: Max USD refunded per day (default: 10000)
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { createSignerProvider, SignerProvider } from './kms-signer.service.js';
import { NonceManager } from './nonce-manager.service.js';

/**
 * Minimal Redis interface required for spending limit tracking.
 * Compatible with ioredis Redis client.
 */
export interface SpendingLimitRedis {
  get(key: string): Promise<string | null>;
  incrby(key: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export interface BlockchainTransactionServiceOptions {
  nonceManager?: NonceManager;
  redis?: SpendingLimitRedis;
  providerManager?: ProviderManager;
}

// ERC-20 ABI (only the functions we need)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

/**
 * Build an array of RPC URLs for a network from environment variables.
 * Prefers comma-separated NETWORK_RPC_URLS, falls back to single
 * NETWORK_RPC_URL, then to a public default.
 */
function getRpcUrls(network: 'polygon' | 'ethereum'): string[] {
  const multiKey = network.toUpperCase() + '_RPC_URLS';
  const singleKey = network.toUpperCase() + '_RPC_URL';
  const defaults: Record<string, string> = {
    polygon: 'https://polygon-rpc.com',
    ethereum: 'https://eth.llamarpc.com',
  };

  const multi = process.env[multiKey];
  if (multi) {
    return multi.split(',').map(u => u.trim()).filter(Boolean);
  }

  const single = process.env[singleKey];
  if (single) {
    return [single];
  }

  return [defaults[network]];
}

// Token contract addresses by network
const TOKEN_ADDRESSES = {
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  ethereum: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
} as const;

type Network = 'polygon' | 'ethereum';
type Token = 'USDC' | 'USDT';

/** Default daily refund cap in USD */
const DEFAULT_DAILY_REFUND_LIMIT = 10_000;

/** TTL for daily spend keys: 48 hours to survive timezone edge cases */
const SPEND_KEY_TTL_SECONDS = 48 * 60 * 60; // 172800

export interface RefundTransactionParams {
  network: Network;
  token: Token;
  recipientAddress: string;
  amount: number; // USD amount
}

export interface RefundTransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
  gasUsed?: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  estimatedCostWei: string;
  estimatedCostEth: string;
}

export class BlockchainTransactionService {
  private providerManager: ProviderManager;
  private wallets: Map<string, ethers.Wallet> = new Map();
  private signerProvider: SignerProvider;
  private nonceManager: NonceManager | null;
  private redis: SpendingLimitRedis | null;
  private dailyRefundLimit: number;
  private readonly decimals = 6; // USDC and USDT use 6 decimals

  constructor(options?: BlockchainTransactionServiceOptions) {
    // SECURITY: Use signer provider abstraction instead of direct env var access
    this.signerProvider = createSignerProvider();

    // Initialize provider manager with failover support
    this.providerManager = options?.providerManager ?? new ProviderManager();

    if (!options?.providerManager) {
      this.providerManager.addProviders('polygon', getRpcUrls('polygon'));
      this.providerManager.addProviders('ethereum', getRpcUrls('ethereum'));
    }

    // Initialize optional nonce manager for concurrent transaction safety
    this.nonceManager = options?.nonceManager ?? null;

    // Initialize optional Redis for daily spending limit tracking
    this.redis = options?.redis ?? null;

    // Read configurable daily refund limit from environment
    const envLimit = process.env.DAILY_REFUND_LIMIT;
    this.dailyRefundLimit = envLimit
      ? Number(envLimit)
      : DEFAULT_DAILY_REFUND_LIMIT;

    logger.info('BlockchainTransactionService initialized', {
      signerType: process.env.USE_KMS === 'true' ? 'KMS' : 'EnvVar',
      networks: ['polygon', 'ethereum'],
      nonceManaged: this.nonceManager !== null,
      dailyRefundLimit: this.dailyRefundLimit,
      spendingLimitEnabled: this.redis !== null,
    });
  }

  /**
   * Build the Redis key for today's daily spend counter.
   * Format: spend:daily:YYYY-MM-DD (UTC date)
   */
  private getDailySpendKey(): string {
    const today = new Date().toISOString().split('T')[0];
    return `spend:daily:${today}`;
  }

  /**
   * Check whether a refund amount would exceed the daily limit.
   * Returns true if the refund is within the limit.
   *
   * If Redis is unavailable, logs a warning and returns true
   * (graceful degradation -- do not block refunds on Redis failure).
   */
  private async checkSpendingLimit(amount: number): Promise<boolean> {
    if (!this.redis) {
      return true; // No Redis = no enforcement (graceful degradation)
    }

    try {
      const key = this.getDailySpendKey();
      const currentSpendStr = await this.redis.get(key);
      const currentSpend = currentSpendStr
        ? Number(currentSpendStr)
        : 0;

      // Convert amount to cents for integer arithmetic
      const amountCents = Math.round(amount * 100);
      const limitCents = Math.round(this.dailyRefundLimit * 100);

      if (currentSpend + amountCents > limitCents) {
        logger.warn('Daily refund spending limit would be exceeded', {
          currentSpendCents: currentSpend,
          refundAmountCents: amountCents,
          dailyLimitCents: limitCents,
        });
        return false;
      }

      return true;
    } catch (error) {
      // Graceful degradation: if Redis is broken, allow the refund
      logger.warn(
        'Redis unavailable for spending limit check, allowing refund',
        error
      );
      return true;
    }
  }

  /**
   * Record a successful refund amount against the daily spend counter.
   * Uses INCRBY for atomic increment (race-condition safe).
   * Sets a 48-hour TTL so the key auto-expires after the day rolls over.
   */
  private async recordSpend(amount: number): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = this.getDailySpendKey();
      const amountCents = Math.round(amount * 100);
      await this.redis.incrby(key, amountCents);
      await this.redis.expire(key, SPEND_KEY_TTL_SECONDS);
    } catch (error) {
      // Log but do not fail the refund -- the tx already succeeded
      logger.warn(
        'Failed to record spend in Redis after successful refund',
        error
      );
    }
  }

  /**
   * Lazily initialize and cache a wallet per network via the signer
   * provider. Each network gets its own wallet instance to prevent
   * cross-network wallet reuse.
   *
   * Async because KMS wallet retrieval requires a network call.
   */
  private async getWallet(network: Network): Promise<ethers.Wallet> {
    if (!this.wallets.has(network)) {
      const walletOrAdapter =
        await this.signerProvider.getWallet(network);
      this.wallets.set(network, walletOrAdapter as ethers.Wallet);
    }
    return this.wallets.get(network)!;
  }

  /**
   * Get the configured NonceManager, or null if not configured.
   */
  getNonceManager(): NonceManager | null {
    return this.nonceManager;
  }

  /**
   * Execute a refund transaction on the blockchain
   *
   * Sends ERC-20 tokens from merchant wallet back to customer.
   * Enforces a daily spending cap to limit damage from compromised keys.
   */
  async executeRefund(
    params: RefundTransactionParams
  ): Promise<RefundTransactionResult> {
    const { network, token, recipientAddress, amount } = params;

    try {
      // Validate inputs
      if (amount <= 0) {
        return {
          success: false,
          error: 'Amount must be positive',
        };
      }

      if (!ethers.isAddress(recipientAddress)) {
        return {
          success: false,
          error: 'Invalid recipient address',
        };
      }

      // SECURITY: Check daily spending limit before executing
      const withinLimit = await this.checkSpendingLimit(amount);
      if (!withinLimit) {
        return {
          success: false,
          error:
            'Daily refund limit exceeded - manual approval required',
        };
      }

      // Get a healthy provider via failover manager
      const provider = await this.providerManager.getProvider(network);

      const wallet = await this.getWallet(network);
      const connectedWallet = wallet.connect(provider);

      // Get token contract
      const tokenAddress = TOKEN_ADDRESSES[network][token];
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        connectedWallet
      );

      // Convert amount to token units (6 decimals for USDC/USDT)
      const amountInTokenUnits = BigInt(
        Math.floor(amount * Math.pow(10, this.decimals))
      );

      logger.info('Executing refund transaction', {
        network,
        token,
        recipient: recipientAddress,
        amount,
        amountInTokenUnits: amountInTokenUnits.toString(),
        merchantWallet: wallet.address,
      });

      // Estimate gas first
      try {
        const gasEstimate =
          await tokenContract.transfer.estimateGas(
            recipientAddress,
            amountInTokenUnits
          );
        logger.debug('Gas estimate', {
          gasEstimate: gasEstimate.toString(),
        });
      } catch (error) {
        logger.error('Gas estimation failed', error);
        return {
          success: false,
          error: `Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

      // Acquire nonce if nonce manager is configured
      let nonce: number | undefined;
      if (this.nonceManager) {
        nonce = await this.nonceManager.getNextNonce(
          wallet.address,
          provider
        );
        logger.info('Nonce acquired for transaction', {
          nonce,
          walletAddress: wallet.address,
        });
      }

      // Execute transfer (with managed nonce if available)
      const transferOptions = nonce !== undefined ? { nonce } : {};
      const tx = await tokenContract.transfer(
        recipientAddress,
        amountInTokenUnits,
        transferOptions
      );

      logger.info('Refund transaction sent', {
        txHash: tx.hash,
        network,
        token,
        recipient: recipientAddress,
        amount,
        nonce,
      });

      // Wait for confirmation
      const receipt = await tx.wait(1);

      // Confirm nonce was used successfully
      if (this.nonceManager && nonce !== undefined) {
        await this.nonceManager.confirmNonce(wallet.address, nonce);
      }

      // Check transaction status
      if (receipt.status !== 1) {
        logger.error('Refund transaction failed on-chain', {
          txHash: tx.hash,
          status: receipt.status,
        });
        return {
          success: false,
          txHash: tx.hash,
          error: 'Transaction failed on-chain',
        };
      }

      // SECURITY: Record the successful spend against the daily limit
      await this.recordSpend(amount);

      logger.info('Refund transaction confirmed', {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error('Refund transaction failed', error, {
        network,
        token,
        recipient: recipientAddress,
        amount,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Estimate gas cost for a refund transaction
   *
   * Useful for showing estimated fees to merchants before executing
   */
  async estimateRefundGas(
    params: RefundTransactionParams
  ): Promise<GasEstimate> {
    const { network, token, recipientAddress, amount } = params;

    const provider = await this.providerManager.getProvider(network);

    const wallet = await this.getWallet(network);
    const connectedWallet = wallet.connect(provider);
    const tokenAddress = TOKEN_ADDRESSES[network][token];
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      connectedWallet
    );

    const amountInTokenUnits = BigInt(
      Math.floor(amount * Math.pow(10, this.decimals))
    );

    // Estimate gas
    const gasLimit = await tokenContract.transfer.estimateGas(
      recipientAddress,
      amountInTokenUnits
    );
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    const estimatedCostWei = gasLimit * gasPrice;
    const estimatedCostEth = ethers.formatEther(estimatedCostWei);

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCostWei: estimatedCostWei.toString(),
      estimatedCostEth,
    };
  }

  /**
   * Get merchant wallet balance for a specific token
   *
   * Useful for checking if merchant has enough tokens to process refunds
   */
  async getMerchantBalance(
    network: Network,
    token: Token
  ): Promise<number> {
    const provider = await this.providerManager.getProvider(network);

    const wallet = await this.getWallet(network);
    const tokenAddress = TOKEN_ADDRESSES[network][token];
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    const balance = await tokenContract.balanceOf(wallet.address);
    const balanceInUsd =
      Number(balance) / Math.pow(10, this.decimals);

    return balanceInUsd;
  }
}
