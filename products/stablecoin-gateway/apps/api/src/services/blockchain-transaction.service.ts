/**
 * Blockchain Transaction Service
 *
 * Handles execution of blockchain transactions for refunds.
 *
 * Features:
 * - ERC-20 token transfers (USDC, USDT)
 * - Transaction signing via KMS signer abstraction
 * - Multi-network support (Polygon, Ethereum)
 * - RPC provider failover with health checks
 * - Error handling and retry logic
 * - Optional nonce management via NonceManager for concurrent safety
 * - Daily spending limits to prevent unlimited fund drainage
 *
 * Read-only queries (gas estimation, balance lookups) have been
 * extracted to BlockchainQueryService.
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
import { amountToTokenUnits } from '../utils/token-units.js';
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

import { TOKEN_ADDRESSES, getRpcUrls, Network, Token } from '../constants/tokens.js';

/**
 * Network-specific confirmation requirements for transaction finality.
 *
 * These represent the number of block confirmations required before a
 * refund transaction is considered final (safe from blockchain reorgs).
 *
 * - Polygon: 12 confirmations (~24 seconds)
 * - Ethereum: 3 confirmations (~36 seconds)
 */
export const CONFIRMATION_REQUIREMENTS: Record<Network, number> = {
  polygon: 12,
  ethereum: 3,
};

/** Default daily refund cap in USD */
const DEFAULT_DAILY_REFUND_LIMIT = 10_000;

/** TTL for daily spend keys: 48 hours to survive timezone edge cases */
const SPEND_KEY_TTL_SECONDS = 48 * 60 * 60; // 172800

/**
 * Convert a dollar amount to cents using string arithmetic.
 * Avoids IEEE 754 floating-point errors that affect Math.round().
 * e.g. Math.round(1.005 * 100) = 100, but dollarsToCents(1.005) = 101
 */
function dollarsToCents(amount: number): number {
  const str = amount.toString();
  const parts = str.split('.');
  const dollars = parts[0];
  const cents = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  const subCents = (parts[1] || '').slice(2);
  const base = parseInt(dollars, 10) * 100 + parseInt(cents, 10);
  // Round up if there are sub-cent digits >= 5
  if (subCents.length > 0 && parseInt(subCents[0], 10) >= 5) {
    return base + 1;
  }
  return base;
}

export interface RefundTransactionParams {
  network: Network;
  token: Token;
  recipientAddress: string;
  amount: number | string; // USD amount (string preserves sub-cent precision)
}

export interface RefundTransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
  gasUsed?: string;
  pendingConfirmations?: number;
}

/**
 * ADR: Blockchain Transaction Safety Measures
 *
 * Spending limits use string-based dollar-to-cents conversion
 * (dollarsToCents) instead of native JS floating-point arithmetic.
 * IEEE 754 double-precision cannot represent many decimal values
 * exactly: Math.round(1.005 * 100) produces 100 instead of 101.
 * In a refund system, this could allow cumulative over-spending
 * that bypasses the daily cap. String splitting isolates the integer
 * and fractional parts, avoiding floating-point multiplication
 * entirely, and then applies correct sub-cent rounding.
 *
 * Nonce management is optional (injected via constructor options)
 * because not all deployment configurations require it. Single-
 * instance deployments with sequential refund processing do not
 * have concurrent nonce contention. Forcing a Redis-backed nonce
 * manager in those environments adds operational complexity and a
 * failure mode (Redis outage blocking all refunds) for no benefit.
 * When multiple API instances process refunds concurrently, the
 * NonceManager is injected to serialize nonce allocation via Redis
 * and prevent nonce collisions that cause transaction reverts.
 *
 * The service validates network/token combinations against an
 * explicit TOKEN_ADDRESSES registry rather than accepting arbitrary
 * contract addresses. Stablecoins are deployed at different
 * addresses on each network (e.g. USDC on Polygon vs Ethereum).
 * Sending tokens to the wrong contract address on the wrong network
 * results in permanent fund loss. The registry acts as an allowlist
 * so only known-good combinations are executable.
 *
 * Alternatives considered:
 * - BigInt for cent arithmetic: Rejected because the inputs arrive
 *   as JS numbers from JSON parsing; converting to BigInt still
 *   requires parsing the decimal, which is what dollarsToCents does.
 * - Mandatory nonce manager: Rejected because it would require Redis
 *   in all environments including single-node dev setups.
 * - Accepting raw contract addresses from callers: Rejected because
 *   it shifts the burden of address correctness to every caller and
 *   opens the door to sending funds to arbitrary contracts.
 */
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
   * Atomically check and reserve spending against the daily limit.
   * Returns true if the refund is within the limit and the spend
   * has been reserved.
   *
   * Uses INCRBY to atomically increment the counter, then checks
   * if the new total exceeds the limit. If it does, decrements
   * back (rollback). This eliminates the check-then-spend race
   * condition where concurrent requests could both pass a GET-based
   * check before either records its spend.
   *
   * If Redis is unavailable, logs a warning and returns true
   * (graceful degradation -- do not block refunds on Redis failure).
   */
  private async checkAndReserveSpend(amount: number): Promise<boolean> {
    if (!this.redis) {
      return true; // No Redis = no enforcement (graceful degradation)
    }

    try {
      const key = this.getDailySpendKey();
      const amountCents = dollarsToCents(amount);
      const limitCents = dollarsToCents(this.dailyRefundLimit);

      // Atomically increment first, then check
      const newTotal = await this.redis.incrby(key, amountCents);
      // Ensure the key has a TTL (idempotent if already set)
      await this.redis.expire(key, SPEND_KEY_TTL_SECONDS);

      if (newTotal > limitCents) {
        // Over limit: roll back the increment
        await this.redis.incrby(key, -amountCents);
        logger.warn('Daily refund spending limit would be exceeded', {
          currentSpendCents: newTotal - amountCents,
          refundAmountCents: amountCents,
          dailyLimitCents: limitCents,
        });
        return false;
      }

      return true;
    } catch (error: unknown) {
      // Graceful degradation: if Redis is broken, allow the refund
      logger.warn(
        'Redis unavailable for spending limit check, allowing refund',
        { error } as Record<string, unknown>
      );
      return true;
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
      if (Number(amount) <= 0) {
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

      // SECURITY: Atomically check and reserve daily spending limit before executing.
      // This eliminates the race condition where concurrent requests could both
      // pass the limit check before either records its spend.
      const withinLimit = await this.checkAndReserveSpend(Number(amount));
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

      // Convert amount to token units using string arithmetic (precision-safe)
      const amountInTokenUnits = amountToTokenUnits(amount.toString(), this.decimals);

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

      // Spend was already atomically reserved in checkAndReserveSpend()
      // No separate recordSpend needed.

      // Calculate how many more confirmations are needed for finality
      const requiredConfirmations = CONFIRMATION_REQUIREMENTS[network];
      const pendingConfirmations = Math.max(0, requiredConfirmations - 1);

      logger.info('Refund transaction confirmed (initial)', {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        pendingConfirmations,
        requiredConfirmations,
      });

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        pendingConfirmations,
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
}
