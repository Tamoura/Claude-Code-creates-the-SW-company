export type PaymentStatus = 'pending' | 'confirming' | 'complete';

export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  txHash?: string;
  createdAt: number;
  completedAt?: number;
}

export interface WalletInfo {
  address: string;
  balance: number;
  connected: boolean;
}

export interface TransactionResult {
  hash: string;
  status: 'success' | 'failed';
}
