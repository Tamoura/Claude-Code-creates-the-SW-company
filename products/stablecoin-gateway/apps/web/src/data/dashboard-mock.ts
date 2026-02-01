export const stats = {
  totalBalance: {
    title: 'Total Balance',
    value: '$124,592.00',
    trend: '+12.5% this week',
  },
  settlementVolume: {
    title: 'Settlement Volume',
    value: '$89,240.50',
    trend: '+4.2% this week',
  },
  successRate: {
    title: 'Success Rate',
    value: '99.8%',
    subtitle: 'Stable over 30 days',
  },
};

export const recentTransactions = [
  {
    id: '#TX-8821',
    customer: '0x4a...9f21',
    date: 'Oct 24, 2023',
    amount: '$50.00',
    asset: 'USDC',
    status: 'SUCCESS' as const,
  },
  {
    id: '#TX-8820',
    customer: 'alice@crypto.io',
    date: 'Oct 23, 2023',
    amount: '$1,200.00',
    asset: 'DAI',
    status: 'SUCCESS' as const,
  },
  {
    id: '#TX-8819',
    customer: '0x8b...22a1',
    date: 'Oct 23, 2023',
    amount: '$15.00',
    asset: 'USDT',
    status: 'PENDING' as const,
  },
];

export const apiKey = 'pk_live_51MzQ2...k9J2s';

export const codeSnippet = `const stableflow = require('stableflow')('pk_live_...');

// Create a payment intent
await stableflow.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usdc',
  network: 'ethereum',
  confirm: true,
});`;
