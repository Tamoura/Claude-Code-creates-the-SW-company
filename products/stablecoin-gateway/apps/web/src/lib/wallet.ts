import type { TransactionResult } from '../types/payment';

/**
 * Environment check for mock mode.
 * Mock mode is ONLY allowed in development and ONLY when explicitly enabled.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

// Production safety check - warn loudly if mock is enabled in production
if (IS_PROD && USE_MOCK) {
  console.error(
    '[SECURITY WARNING] Mock wallet is enabled in production! This should never happen. ' +
    'Set VITE_USE_MOCK=false in your environment.'
  );
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * WalletProvider interface - abstraction for wallet operations
 */
export interface WalletProvider {
  readonly address: string;
  balance: number;
  connected: boolean;
  connect(): Promise<string>;
  sendTransaction(amount: number): Promise<TransactionResult>;
  disconnect(): void;
}

/**
 * MockWallet - ONLY for development/testing purposes
 * This class is tree-shaken out in production builds when USE_MOCK is false
 */
class MockWallet implements WalletProvider {
  private _address: string = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  balance: number = 1000.00;
  connected: boolean = false;

  get address(): string {
    return this._address;
  }

  async connect(): Promise<string> {
    await delay(1000); // Simulate connection delay
    this.connected = true;
    return this._address;
  }

  async sendTransaction(amount: number): Promise<TransactionResult> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    if (amount > this.balance) {
      throw new Error('Insufficient balance');
    }

    // Simulate blockchain confirmation
    await delay(5000);

    // Deduct balance
    this.balance -= amount;

    // Generate fake transaction hash
    const hash = '0x' + crypto.randomUUID().replace(/-/g, '');

    return {
      hash,
      status: 'success',
    };
  }

  disconnect(): void {
    this.connected = false;
  }

  reset(): void {
    this.connected = false;
    this.balance = 1000.00;
  }
}

/**
 * RealWalletProvider - Production wallet implementation
 * Uses WalletConnect or similar real wallet connection
 */
class RealWalletProvider implements WalletProvider {
  private _address: string = '';
  balance: number = 0;
  connected: boolean = false;

  get address(): string {
    return this._address;
  }

  async connect(): Promise<string> {
    // TODO: Implement real wallet connection via WalletConnect
    // This would use the VITE_WALLETCONNECT_PROJECT_ID from env
    throw new Error(
      'Real wallet connection not yet implemented. ' +
      'Configure WalletConnect or enable mock mode for development.'
    );
  }

  async sendTransaction(_amount: number): Promise<TransactionResult> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    // TODO: Implement real blockchain transaction
    // This would use ethers.js or viem to send actual transactions
    throw new Error('Real transaction sending not yet implemented.');
  }

  disconnect(): void {
    this.connected = false;
    this._address = '';
    this.balance = 0;
  }
}

// Singleton instances
let mockWalletInstance: MockWallet | null = null;
let realWalletInstance: RealWalletProvider | null = null;

/**
 * Get the mock wallet instance (only available in dev mode with VITE_USE_MOCK=true)
 * @throws Error if called in production or when mock is not enabled
 */
function getMockWallet(): MockWallet {
  if (IS_PROD) {
    throw new Error('Mock wallet cannot be used in production');
  }
  if (!USE_MOCK) {
    throw new Error('Mock wallet not enabled. Set VITE_USE_MOCK=true');
  }
  if (!mockWalletInstance) {
    mockWalletInstance = new MockWallet();
  }
  return mockWalletInstance;
}

/**
 * Get the real wallet provider instance
 */
function getRealWallet(): RealWalletProvider {
  if (!realWalletInstance) {
    realWalletInstance = new RealWalletProvider();
  }
  return realWalletInstance;
}

/**
 * Get the appropriate wallet provider based on environment
 * - In production: Always returns RealWalletProvider
 * - In development with VITE_USE_MOCK=true: Returns MockWallet
 * - In development without mock: Returns RealWalletProvider
 */
export function getWallet(): WalletProvider {
  if (USE_MOCK && IS_DEV) {
    return getMockWallet();
  }
  return getRealWallet();
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return USE_MOCK && IS_DEV;
}

/**
 * Check if running in production mode
 */
export function isProductionMode(): boolean {
  return IS_PROD;
}

// Legacy exports for backward compatibility with tests
// These are gated and will throw in production

/**
 * @deprecated Use getWallet() instead
 * Direct access to mockWallet - only for test backward compatibility
 */
export const mockWallet: WalletProvider = new Proxy({} as WalletProvider, {
  get(_target, prop) {
    if (IS_PROD) {
      throw new Error('mockWallet cannot be accessed in production');
    }
    const wallet = getMockWallet();
    const value = wallet[prop as keyof MockWallet];
    if (typeof value === 'function') {
      return value.bind(wallet);
    }
    return value;
  },
  set(_target, prop, value) {
    if (IS_PROD) {
      throw new Error('mockWallet cannot be modified in production');
    }
    const wallet = getMockWallet();
    (wallet as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
});

/**
 * @deprecated Use getWallet() instead
 * Reset the mock wallet state - only for test backward compatibility
 */
export function resetWallet(): void {
  if (IS_PROD) {
    throw new Error('resetWallet cannot be called in production');
  }
  if (mockWalletInstance) {
    mockWalletInstance.reset();
  }
}
