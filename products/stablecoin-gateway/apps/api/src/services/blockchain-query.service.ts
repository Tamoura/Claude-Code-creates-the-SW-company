/**
 * Blockchain Query Service
 *
 * Read-only blockchain queries: gas estimation and balance lookups.
 * Extracted from BlockchainTransactionService to separate concerns
 * (queries vs state-changing transactions).
 *
 * Features:
 * - ERC-20 gas estimation for refund transfers
 * - Merchant wallet balance lookups
 * - Multi-network support (Polygon, Ethereum)
 * - RPC provider failover via ProviderManager
 */

import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { createSignerProvider, SignerProvider } from './kms-signer.service.js';
import { TOKEN_ADDRESSES, Network, Token } from '../constants/tokens.js';

// ERC-20 ABI (only the functions we need for queries)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  estimatedCostWei: string;
  estimatedCostEth: string;
}

export interface RefundGasParams {
  network: Network;
  token: Token;
  recipientAddress: string;
  amount: number;
}

export class BlockchainQueryService {
  private providerManager: ProviderManager;
  private signerProvider: SignerProvider;
  private wallets: Map<string, ethers.Wallet> = new Map();
  private readonly decimals = 6; // USDC and USDT use 6 decimals

  constructor(
    providerManager: ProviderManager,
    signerProvider?: SignerProvider
  ) {
    this.providerManager = providerManager;
    this.signerProvider = signerProvider ?? createSignerProvider();
  }

  /**
   * Lazily initialize and cache a wallet per network via the signer
   * provider. Each network gets its own wallet instance to prevent
   * cross-network wallet reuse.
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
   * Estimate gas cost for a refund transaction.
   *
   * Useful for showing estimated fees to merchants before executing.
   */
  async estimateRefundGas(params: RefundGasParams): Promise<GasEstimate> {
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

    // Use Decimal.js for precise token unit conversion (avoids IEEE 754 float errors)
    const amountInTokenUnits = BigInt(
      new Decimal(amount).times(new Decimal(10).pow(this.decimals)).floor().toString()
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
   * Get merchant wallet balance for a specific token.
   *
   * Useful for checking if merchant has enough tokens to process refunds.
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
    // Use Decimal.js for precise balance conversion (avoids IEEE 754 float errors)
    const balanceInUsd = new Decimal(balance.toString())
      .dividedBy(new Decimal(10).pow(this.decimals))
      .toNumber();

    return balanceInUsd;
  }
}
