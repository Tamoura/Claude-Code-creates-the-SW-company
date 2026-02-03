import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { TOKEN_ADDRESSES, getRpcUrls, Network, Token } from '../constants/tokens.js';

/** Default RPC call timeout: 15 seconds */
const DEFAULT_RPC_TIMEOUT_MS = 15_000;

export interface BlockchainMonitorServiceOptions {
  providerManager?: ProviderManager;
  /** Timeout in milliseconds for individual RPC calls (default: 15 000) */
  rpcTimeoutMs?: number;
}

export interface PaymentSessionForVerification {
  id: string;
  network: Network;
  token: Token;
  amount: number;
  merchantAddress: string;
  customerAddress?: string;
}

export interface VerificationResult {
  valid: boolean;
  confirmations: number;
  blockNumber: number;
  sender: string;
  error?: string;
}

/**
 * Wrap a promise with a timeout. If the promise does not settle within
 * `ms` milliseconds, the returned promise rejects with a descriptive
 * error that includes the operation label.
 *
 * RISK-045: Prevents indefinite blocking when a blockchain RPC node hangs.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Convert a wei (smallest unit) amount to a USD string with exact precision.
 *
 * Uses Decimal.js to avoid IEEE 754 floating-point errors that occur
 * with Number(amountWei) / Math.pow(10, decimals).
 *
 * @param amountWei - The amount in smallest token units (e.g. 1000000 for 1 USDC)
 * @param decimals  - Number of decimal places for the token (6 for USDC/USDT)
 * @returns The amount as a precise decimal string
 */
export function weiToUsd(amountWei: string, decimals: number): string {
  return new Decimal(amountWei).dividedBy(new Decimal(10).pow(decimals)).toString();
}

export class BlockchainMonitorService {
  private providerManager: ProviderManager;
  private rpcTimeoutMs: number;

  constructor(options?: BlockchainMonitorServiceOptions) {
    // Initialize provider manager with failover support
    this.providerManager = options?.providerManager ?? new ProviderManager();
    this.rpcTimeoutMs = options?.rpcTimeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;

    if (!options?.providerManager) {
      this.providerManager.addProviders('polygon', getRpcUrls('polygon'));
      this.providerManager.addProviders('ethereum', getRpcUrls('ethereum'));
    }

    logger.info('BlockchainMonitorService initialized', {
      networks: ['polygon', 'ethereum'],
    });
  }

  /**
   * Verify a payment transaction on the blockchain
   *
   * Checks:
   * - Transaction exists on chain
   * - Has minimum confirmations (default: 12)
   * - Recipient matches merchant address
   * - Token contract matches expected token
   * - Amount matches expected amount (exact or overpayment)
   * - Sender matches customer address (if provided)
   */
  async verifyPaymentTransaction(
    paymentSession: PaymentSessionForVerification,
    txHash: string,
    minConfirmations: number = 12
  ): Promise<VerificationResult> {
    let provider: ethers.JsonRpcProvider;

    try {
      provider = await this.providerManager.getProvider(paymentSession.network);
    } catch {
      throw new AppError(
        500,
        'invalid-network',
        'Invalid blockchain network: ' + paymentSession.network
      );
    }

    try {
      // Get transaction receipt (with timeout - RISK-045)
      const receipt = await withTimeout(
        provider.getTransactionReceipt(txHash),
        this.rpcTimeoutMs,
        'getTransactionReceipt',
      );

      if (!receipt) {
        return {
          valid: false,
          confirmations: 0,
          blockNumber: 0,
          sender: '',
          error: 'Transaction not found on blockchain',
        };
      }

      // Get current block number to calculate confirmations (with timeout - RISK-045)
      const currentBlock = await withTimeout(
        provider.getBlockNumber(),
        this.rpcTimeoutMs,
        'getBlockNumber',
      );
      const confirmations = currentBlock - receipt.blockNumber + 1;

      // Check minimum confirmations
      if (confirmations < minConfirmations) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: '',
          error: 'Insufficient confirmations (' + confirmations + '/' + minConfirmations + ')',
        };
      }

      // Get token contract address for this network and token
      const expectedTokenAddress = TOKEN_ADDRESSES[paymentSession.network][paymentSession.token];

      // Parse Transfer event from logs
      // ERC-20 Transfer event signature: Transfer(address,address,uint256)
      const transferEventSignature = ethers.id('Transfer(address,address,uint256)');

      // FIX: Filter for transfer matching BOTH recipient AND amount
      // Transactions can have multiple transfers (fees, multi-send), need to find the right one
      const expectedMerchantAddress = paymentSession.merchantAddress.toLowerCase();
      const decimals = 6; // USDC and USDT use 6 decimals

      // Find all Transfer events for this token
      const transferEvents = receipt.logs.filter(log => {
        return (
          log.address.toLowerCase() === expectedTokenAddress.toLowerCase() &&
          log.topics[0] === transferEventSignature
        );
      });

      if (transferEvents.length === 0) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: '',
          error: 'No ' + paymentSession.token + ' transfer found in transaction',
        };
      }

      // Find the transfer that matches both recipient and amount
      // Decode Transfer event: topics[1] = from, topics[2] = to, data = amount
      let matchingTransfer: typeof transferEvents[0] | undefined;
      let fromAddress = '';

      for (const log of transferEvents) {
        const toAddress = '0x' + log.topics[2].slice(26); // Remove 0x and padding
        const amountWei = BigInt(log.data);
        const amountUsd = new Decimal(amountWei.toString()).dividedBy(new Decimal(10).pow(decimals));
        // Security: accept exact payment or overpayment only (no underpayment tolerance)

        // Check if this transfer matches merchant address AND amount >= expected
        if (
          toAddress.toLowerCase() === expectedMerchantAddress &&
          amountUsd.greaterThanOrEqualTo(paymentSession.amount)
        ) {
          matchingTransfer = log;
          fromAddress = '0x' + log.topics[1].slice(26);
          break;
        }
      }

      if (!matchingTransfer) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: fromAddress || ('0x' + transferEvents[0].topics[1].slice(26)),
          error: 'No matching transfer found (expected ' + paymentSession.amount + ' ' + paymentSession.token + ' to ' + paymentSession.merchantAddress + '). Found ' + transferEvents.length + ' transfer(s) but none matched recipient and amount.',
        };
      }

      // Validate sender if customer address is known
      if (paymentSession.customerAddress) {
        const expectedSender = paymentSession.customerAddress.toLowerCase();
        if (fromAddress.toLowerCase() !== expectedSender) {
          logger.warn('Transfer sender does not match expected customer address', {
            paymentSessionId: paymentSession.id,
            expectedSender: paymentSession.customerAddress,
            actualSender: fromAddress,
          });
          return {
            valid: false,
            confirmations,
            blockNumber: receipt.blockNumber,
            sender: fromAddress,
            error: `Sender mismatch: expected ${paymentSession.customerAddress}, got ${fromAddress}`,
          };
        }
      }

      // Use the matching transfer data
      const toAddress = '0x' + matchingTransfer.topics[2].slice(26);
      const amountWei = BigInt(matchingTransfer.data);
      const amountUsd = new Decimal(amountWei.toString()).dividedBy(new Decimal(10).pow(decimals));

      // Secondary verification: ensure amount meets or exceeds expected

      if (amountUsd.lessThan(paymentSession.amount)) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: fromAddress,
          error: 'Amount mismatch (expected ' + paymentSession.amount + ', got ' + amountUsd + ')',
        };
      }

      // All checks passed
      logger.info('Payment transaction verified', {
        paymentSessionId: paymentSession.id,
        txHash,
        network: paymentSession.network,
        token: paymentSession.token,
        amount: amountUsd.toNumber(),
        confirmations,
        sender: fromAddress,
        recipient: toAddress,
      });

      return {
        valid: true,
        confirmations,
        blockNumber: receipt.blockNumber,
        sender: fromAddress,
      };
    } catch (error) {
      logger.error('Error verifying payment transaction', {
        paymentSessionId: paymentSession.id,
        txHash,
        error,
      });

      throw new AppError(
        500,
        'blockchain-error',
        'Failed to verify transaction: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get number of confirmations for a transaction
   */
  async getConfirmations(network: Network, txHash: string): Promise<number> {
    let provider: ethers.JsonRpcProvider;

    try {
      provider = await this.providerManager.getProvider(network);
    } catch {
      throw new AppError(500, 'invalid-network', 'Invalid blockchain network: ' + network);
    }

    try {
      const receipt = await withTimeout(
        provider.getTransactionReceipt(txHash),
        this.rpcTimeoutMs,
        'getTransactionReceipt',
      );

      if (!receipt) {
        return 0;
      }

      const currentBlock = await withTimeout(
        provider.getBlockNumber(),
        this.rpcTimeoutMs,
        'getBlockNumber',
      );
      return currentBlock - receipt.blockNumber + 1;
    } catch (error) {
      logger.error('Error getting confirmations', { network, txHash, error });
      return 0;
    }
  }
}
