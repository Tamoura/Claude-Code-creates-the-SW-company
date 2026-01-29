import { updatePayment } from './payments';
import { getWallet, isMockMode, isProductionMode } from './wallet';

/**
 * Environment check for mock mode.
 * Mock mode is ONLY allowed in development and ONLY when explicitly enabled.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

// Production safety check
if (IS_PROD && USE_MOCK) {
  console.error(
    '[SECURITY WARNING] Mock transactions enabled in production! ' +
    'Set VITE_USE_MOCK=false in your environment.'
  );
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simulate a transaction - ONLY for development/testing
 * @deprecated Use processTransaction instead for proper environment handling
 * @throws Error if called in production
 */
export async function simulateTransaction(paymentId: string, _amount: number): Promise<string> {
  // Block simulation in production
  if (IS_PROD) {
    throw new Error('simulateTransaction cannot be called in production');
  }

  if (!USE_MOCK) {
    throw new Error('Mock transactions not enabled. Set VITE_USE_MOCK=true');
  }

  // Update to "confirming"
  updatePayment(paymentId, { status: 'confirming' });

  // Wait 5 seconds (blockchain confirmation)
  await delay(5000);

  // Generate fake tx hash
  const txHash = '0x' + crypto.randomUUID().replace(/-/g, '');

  // Update to "complete"
  updatePayment(paymentId, {
    status: 'complete',
    txHash,
    completedAt: Date.now(),
  });

  return txHash;
}

/**
 * Process a real blockchain transaction
 * This is the production-safe implementation
 */
export async function processRealTransaction(
  paymentId: string,
  amount: number,
  _recipientAddress: string
): Promise<string> {
  const wallet = getWallet();

  if (!wallet.connected) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  // Update to "confirming"
  updatePayment(paymentId, { status: 'confirming' });

  try {
    // Send the actual transaction
    const result = await wallet.sendTransaction(amount);

    if (result.status !== 'success') {
      throw new Error('Transaction failed');
    }

    // Update to "complete"
    updatePayment(paymentId, {
      status: 'complete',
      txHash: result.hash,
      completedAt: Date.now(),
    });

    return result.hash;
  } catch (error) {
    // Revert to pending on failure
    updatePayment(paymentId, { status: 'pending' });
    throw error;
  }
}

/**
 * Process a transaction with proper environment handling
 * - In production: Uses real blockchain transaction
 * - In development with mock: Uses simulated transaction
 * - In development without mock: Uses real blockchain transaction
 */
export async function processTransaction(
  paymentId: string,
  amount: number,
  recipientAddress: string
): Promise<string> {
  // In mock mode (dev only), use simulation
  if (isMockMode()) {
    return simulateTransaction(paymentId, amount);
  }

  // Otherwise, use real transaction
  return processRealTransaction(paymentId, amount, recipientAddress);
}

/**
 * Check if mock transactions are enabled
 */
export function isMockTransactionMode(): boolean {
  return USE_MOCK && IS_DEV;
}

/**
 * Check if running in production mode
 */
export { isProductionMode };
