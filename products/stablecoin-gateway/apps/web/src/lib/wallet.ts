import type { WalletInfo, TransactionResult } from '../types/payment';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockWallet implements WalletInfo {
  address: string = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  balance: number = 1000.00;
  connected: boolean = false;

  async connect(): Promise<string> {
    await delay(1000); // Simulate connection delay
    this.connected = true;
    return this.address;
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
}

export const mockWallet = new MockWallet();

export function resetWallet(): void {
  mockWallet.connected = false;
  mockWallet.balance = 1000.00;
}
