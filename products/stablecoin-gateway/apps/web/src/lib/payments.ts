import type { Payment } from '../types/payment';

const STORAGE_KEY = 'stablecoin-payments';

function getPaymentsFromStorage(): Payment[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function savePaymentsToStorage(payments: Payment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
}

export function createPayment(amount: number): Payment {
  const payment: Payment = {
    id: crypto.randomUUID(),
    amount,
    status: 'pending',
    createdAt: Date.now(),
  };

  const payments = getPaymentsFromStorage();
  payments.push(payment);
  savePaymentsToStorage(payments);

  return payment;
}

export function getPayment(id: string): Payment | null {
  const payments = getPaymentsFromStorage();
  return payments.find(p => p.id === id) || null;
}

export function updatePayment(id: string, updates: Partial<Payment>): void {
  const payments = getPaymentsFromStorage();
  const index = payments.findIndex(p => p.id === id);

  if (index !== -1) {
    payments[index] = { ...payments[index], ...updates };
    savePaymentsToStorage(payments);
  }
}

export function getAllPayments(): Payment[] {
  return getPaymentsFromStorage();
}
