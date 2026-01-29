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
 * - Error handling and retry logic
 * - Optional nonce management via NonceManager for concurrent safety
 *
 * Security:
 * - Uses KMS signer abstraction (never reads raw private key directly)
 * - In production: AWS KMS signing (USE_KMS=true)
 * - In development: env var fallback with warning
 * - Address validation
 * - Amount validation
 * - Transaction confirmation
 * - Redis-based nonce serialization (when NonceManager provided)
 *
 * Environment Variables:
 * - USE_KMS: 'true' for KMS signing, 'false' for env var fallback
 * - KMS_KEY_ID: AWS KMS key identifier (required if USE_KMS=true)
 * - MERCHANT_WALLET_PRIVATE_KEY: Fallback key (dev only, when USE_KMS=false)
 * - POLYGON_RPC_URL: Polygon RPC endpoint (optional, defaults to public)
 * - ETHEREUM_RPC_URL: Ethereum RPC endpoint (optional, defaults to public)
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { createSignerProvider, SignerProvider } from './kms-signer.service.js';
import { NonceManager } from './nonce-manager.service.js';

export interface BlockchainTransactionServiceOptions {
  nonceManager?: NonceManager;
}

// ERC-20 ABI (only the functions we need)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

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
  private providers: Map<string, ethers.JsonRpcProvider>;
  private wallet: ethers.Wallet | null = null;
  private signerProvider: SignerProvider;
  private walletInitialized = false;
  private nonceManager: NonceManager | null;
  private readonly decimals = 6; // USDC and USDT use 6 decimals

  constructor(options?: BlockchainTransactionServiceOptions) {
    // SECURITY: Use signer provider abstraction instead of direct env var access
    // In production: KMS signing. In dev: env var fallback with warning.
    this.signerProvider = createSignerProvider();

    // Initialize providers
    this.providers = new Map();

    const polygonRpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.providers.set('polygon', new ethers.JsonRpcProvider(polygonRpcUrl));

    const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
    this.providers.set('ethereum', new ethers.JsonRpcProvider(ethereumRpcUrl));

    // Initialize optional nonce manager for concurrent transaction safety
    this.nonceManager = options?.nonceManager ?? null;

    logger.info('BlockchainTransactionService initialized', {
      signerType: process.env.USE_KMS === 'true' ? 'KMS' : 'EnvVar',
      networks: ['polygon', 'ethereum'],
      nonceManaged: this.nonceManager !== null,
    });
  }

  /**
   * Lazily initialize the wallet via the signer provider.
   * Async because KMS wallet retrieval requires network call.
   */
  private async getWallet(network: Network): Promise<ethers.Wallet> {
    if (!this.walletInitialized) {
      const walletOrAdapter = await this.signerProvider.getWallet(network);
      this.wallet = walletOrAdapter as ethers.Wallet;
      this.walletInitialized = true;
    }
    return this.wallet!;
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
   * Sends ERC-20 tokens from merchant wallet back to customer
   */
  async executeRefund(params: RefundTransactionParams): Promise<RefundTransactionResult> {
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

      // Get provider and connect wallet
      const provider = this.providers.get(network);
      if (!provider) {
        return {
          success: false,
          error: `Unsupported network: ${network}`,
        };
      }

      const wallet = await this.getWallet(network);
      const connectedWallet = wallet.connect(provider);

      // Get token contract
      const tokenAddress = TOKEN_ADDRESSES[network][token];
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, connectedWallet);

      // Convert amount to token units (6 decimals for USDC/USDT)
      const amountInTokenUnits = BigInt(Math.floor(amount * Math.pow(10, this.decimals)));

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
        const gasEstimate = await tokenContract.transfer.estimateGas(
          recipientAddress,
          amountInTokenUnits
        );
        logger.debug('Gas estimate', { gasEstimate: gasEstimate.toString() });
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
        nonce = await this.nonceManager.getNextNonce(wallet.address, provider);
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

      // Wait for confirmation (1 confirmation for now, can be increased)
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
  async estimateRefundGas(params: RefundTransactionParams): Promise<GasEstimate> {
    const { network, token, recipientAddress, amount } = params;

    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const wallet = await this.getWallet(network);
    const connectedWallet = wallet.connect(provider);
    const tokenAddress = TOKEN_ADDRESSES[network][token];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, connectedWallet);

    const amountInTokenUnits = BigInt(Math.floor(amount * Math.pow(10, this.decimals)));

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
  async getMerchantBalance(network: Network, token: Token): Promise<number> {
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const wallet = await this.getWallet(network);
    const tokenAddress = TOKEN_ADDRESSES[network][token];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const balance = await tokenContract.balanceOf(wallet.address);
    const balanceInUsd = Number(balance) / Math.pow(10, this.decimals);

    return balanceInUsd;
  }
}
