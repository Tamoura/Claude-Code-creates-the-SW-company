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

      const transferEvent = receipt.logs.find(log => {
        return (
          log.address.toLowerCase() === expectedTokenAddress.toLowerCase() &&
          log.topics[0] === transferEventSignature
        );
      });

      if (!transferEvent) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: '',
          error: `No ${paymentSession.token} transfer found in transaction`,
        };
      }

      // Decode Transfer event
      // topics[0] = event signature
      // topics[1] = from address (indexed, padded to 32 bytes)
      // topics[2] = to address (indexed, padded to 32 bytes)
      // data = amount (uint256)

      const fromAddress = '0x' + transferEvent.topics[1].slice(26); // Remove 0x and padding
      const toAddress = '0x' + transferEvent.topics[2].slice(26); // Remove 0x and padding
      const amountHex = transferEvent.data;
      const amountWei = BigInt(amountHex);

      // USDC and USDT use 6 decimals (not 18 like ETH)
      const decimals = 6;
      const amountUsd = Number(amountWei) / Math.pow(10, decimals);

      // Verify recipient matches merchant address
      if (toAddress.toLowerCase() !== paymentSession.merchantAddress.toLowerCase()) {
        return {
          valid: false,
          confirmations,
          blockNumber: receipt.blockNumber,
          sender: fromAddress,
          error: `Recipient mismatch (expected ${paymentSession.merchantAddress}, got ${toAddress})`,
        };
      }

      // Verify amount matches (within 0.01 USD tolerance for rounding)
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
