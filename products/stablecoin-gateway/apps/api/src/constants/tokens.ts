/**
 * Token Constants
 *
 * Shared token contract addresses, network types, and RPC URL
 * resolution used across blockchain services.
 */

export const TOKEN_ADDRESSES = {
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  ethereum: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
} as const;

export type Network = 'polygon' | 'ethereum';
export type Token = 'USDC' | 'USDT';

/**
 * Build an array of RPC URLs for a network from environment variables.
 * Prefers comma-separated NETWORK_RPC_URLS, falls back to single
 * NETWORK_RPC_URL, then to a public default.
 */
export function getRpcUrls(network: Network): string[] {
  const multiKey = network.toUpperCase() + '_RPC_URLS';
  const singleKey = network.toUpperCase() + '_RPC_URL';
  const defaults: Record<Network, string> = {
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
