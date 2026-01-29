import { ethers } from 'ethers';
import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';

// USDC and USDT contract addresses by network
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

export interface PaymentSessionForVerification {
  id: string;
  network: Network;
  token: Token;
  amount: number;
  merchantAddress: string;
}

export interface VerificationResult {
  valid: boolean;
  confirmations: number;
  blockNumber: number;
  sender: string;
  error?: string;
}

export class BlockchainMonitorService {
  private providers: Map<string, ethers.JsonRpcProvider>;

  constructor() {
    this.providers = new Map();

    // Initialize Polygon provider
    const polygonRpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.providers.set('polygon', new ethers.JsonRpcProvider(polygonRpcUrl));

    // Initialize Ethereum provider
    const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
    this.providers.set('ethereum', new ethers.JsonRpcProvider(ethereumRpcUrl));

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
   * - Amount matches expected amount (within 0.01 tolerance)
   */
  async verifyPaymentTransaction(
    paymentSession: PaymentSessionForVerification,
    txHash: string,
    minConfirmations: number = 12
  ): Promise<VerificationResult> {
    const provider = this.providers.get(paymentSession.network);

    if (!provider) {
      throw new AppError(500, 'invalid-network', `Invalid blockchain network: ${paymentSession.network}`);
    }

    try {
      // Get transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return {
          valid: false,
          confirmations: 0,
          blockNumber: 0,
          sender: '',
          error: 'Transaction not found on blockchain',
        };
      }

      // Get current block number to calculate confirmations
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      // Check minimum confirmations
      if (confirmations < minConfirmations) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: '',
          error: `Insufficient confirmations (${confirmations}/${minConfirmations})`,
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
          error: `No ${paymentSession.token} transfer found in transaction`,
        };
      }

      // Find the transfer that matches both recipient and amount
      // Decode Transfer event: topics[1] = from, topics[2] = to, data = amount
      let matchingTransfer: typeof transferEvents[0] | undefined;
      let fromAddress = '';

      for (const log of transferEvents) {
        const toAddress = '0x' + log.topics[2].slice(26); // Remove 0x and padding
        const amountWei = BigInt(log.data);
        const amountUsd = Number(amountWei) / Math.pow(10, decimals);
        const amountDiff = Math.abs(amountUsd - paymentSession.amount);

        // Check if this transfer matches merchant address AND expected amount (within 0.01 USD tolerance)
        if (
          toAddress.toLowerCase() === expectedMerchantAddress &&
          amountDiff <= 0.01
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
          error: `No matching transfer found (expected ${paymentSession.amount} ${paymentSession.token} to ${paymentSession.merchantAddress}). Found ${transferEvents.length} transfer(s) but none matched recipient and amount.`,
        };
      }

      // Use the matching transfer data
      const toAddress = '0x' + matchingTransfer.topics[2].slice(26);
      const amountWei = BigInt(matchingTransfer.data);
      const amountUsd = Number(amountWei) / Math.pow(10, decimals);

      // Verification already done in the loop above, but keep for clarity
      const amountDiff = Math.abs(amountUsd - paymentSession.amount);
      if (amountDiff > 0.01) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: fromAddress,
          error: `Amount mismatch (expected ${paymentSession.amount}, got ${amountUsd})`,
        };
      }

      // All checks passed
      logger.info('Payment transaction verified', {
        paymentSessionId: paymentSession.id,
        txHash,
        network: paymentSession.network,
        token: paymentSession.token,
        amount: amountUsd,
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
        `Failed to verify transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get number of confirmations for a transaction
   */
  async getConfirmations(network: Network, txHash: string): Promise<number> {
    const provider = this.providers.get(network);

    if (!provider) {
      throw new AppError(500, 'invalid-network', `Invalid blockchain network: ${network}`);
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return 0;
      }

      const currentBlock = await provider.getBlockNumber();
      return currentBlock - receipt.blockNumber + 1;
    } catch (error) {
      logger.error('Error getting confirmations', { network, txHash, error });
      return 0;
    }
  }
}
