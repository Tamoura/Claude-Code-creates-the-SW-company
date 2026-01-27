import { updatePayment } from './payments';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function simulateTransaction(paymentId: string, _amount: number): Promise<string> {
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
