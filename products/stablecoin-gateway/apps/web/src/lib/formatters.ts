/**
 * Shared Formatting Utilities
 *
 * Centralized formatters used across the application for:
 * - Currency formatting
 * - Date formatting
 * - Address truncation
 * - Block explorer URLs
 */

/**
 * Format a number as USD currency
 * @param amount - The amount to format
 * @param currency - Optional currency code to append (e.g., 'USD', 'USDC')
 * @returns Formatted currency string (e.g., "$1,234.56" or "$1,234.56 USD")
 */
export function formatCurrency(amount: number, currency?: string): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `$${formatted} ${currency}` : `$${formatted}`;
}

/**
 * Format an ISO date string to a human-readable format
 * @param iso - ISO 8601 date string
 * @returns Formatted date string (e.g., "Jan 15, 2024, 3:45 PM")
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Truncate a blockchain address for display
 * @param address - Full blockchain address
 * @returns Truncated address (e.g., "0x1234567890...abcdef")
 */
export function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

/**
 * Get the block explorer URL for a transaction
 * @param network - Network name (ethereum, polygon)
 * @param txHash - Transaction hash
 * @returns Block explorer URL
 */
export function getBlockExplorerUrl(network: string, txHash: string): string {
  const explorers: Record<string, string> = {
    polygon: 'https://polygonscan.com/tx/',
    ethereum: 'https://etherscan.io/tx/',
  };
  return `${explorers[network] || explorers.ethereum}${txHash}`;
}
