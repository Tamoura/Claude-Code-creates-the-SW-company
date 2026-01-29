/**
 * Wagmi Configuration for Wallet Integration
 *
 * Supports:
 * - MetaMask (Browser Extension)
 * - WalletConnect v2 (Mobile wallets)
 * - Polygon and Ethereum networks
 */

import { http, createConfig } from 'wagmi';
import { polygon, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Environment variables
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo_project_id';
const polygonRpcUrl = import.meta.env.VITE_ALCHEMY_POLYGON_URL || 'https://polygon-rpc.com';
const mainnetRpcUrl = import.meta.env.VITE_ALCHEMY_MAINNET_URL || 'https://eth.public-rpc.com';

export const config = createConfig({
  chains: [polygon, mainnet],
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId: walletConnectProjectId,
      metadata: {
        name: 'Stablecoin Gateway',
        description: 'Accept stablecoin payments at 0.5% fees',
        url: 'https://gateway.io',
        icons: ['https://gateway.io/icon.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [polygon.id]: http(polygonRpcUrl),
    [mainnet.id]: http(mainnetRpcUrl),
  },
});

// Token contract addresses
export const TOKEN_ADDRESSES = {
  USDC: {
    [polygon.id]: import.meta.env.VITE_USDC_POLYGON as `0x${string}`,
    [mainnet.id]: import.meta.env.VITE_USDC_ETHEREUM as `0x${string}`,
  },
  USDT: {
    [polygon.id]: import.meta.env.VITE_USDT_POLYGON as `0x${string}`,
    [mainnet.id]: import.meta.env.VITE_USDT_ETHEREUM as `0x${string}`,
  },
} as const;

// Network IDs
export const NETWORK_IDS = {
  polygon: polygon.id,
  ethereum: mainnet.id,
} as const;

// ERC-20 ABI (minimal - just what we need for transfers and balance)
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;
