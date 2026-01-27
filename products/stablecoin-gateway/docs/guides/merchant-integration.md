# Merchant Integration Guide

This guide will help you integrate Stablecoin Gateway into your business in under 10 minutes.

## Overview

Stablecoin Gateway allows you to accept stablecoin payments (USDC/USDT) with three integration methods:

1. **Payment Links** - No coding required (5 minutes)
2. **JavaScript SDK** - Frontend integration (30 minutes)
3. **REST API** - Full backend integration (1-2 hours)

## Prerequisites

- A Stablecoin Gateway account ([signup here](https://gateway.io/signup))
- A cryptocurrency wallet address (Ethereum/Polygon)
  - If you don't have one, install [MetaMask](https://metamask.io/)

## Method 1: Payment Links (No Code)

Perfect for: Manual invoicing, one-time payments, low-volume merchants

### Step 1: Create Account

1. Go to [gateway.io/signup](https://gateway.io/signup)
2. Enter your email and create a password
3. Verify your email address
4. Log in to the dashboard

### Step 2: Add Your Wallet Address

1. Click **Settings** in the sidebar
2. Enter your Ethereum or Polygon wallet address
3. This is where you'll receive payments
4. Click **Save**

**Where to find your wallet address**:
- **MetaMask**: Click the account name at the top to copy address
- **Trust Wallet**: Tap "Receive" → "Ethereum" → Copy address

### Step 3: Create Payment Link

1. Click **Create Payment Link** in the dashboard
2. Fill in the form:
   - **Amount**: `100` (USD)
   - **Description**: `Order #1234` (optional)
   - **Network**: `Polygon` (lower fees) or `Ethereum`
   - **Token**: `USDC` or `USDT`
3. Click **Generate Link**

### Step 4: Share Link with Customer

1. Copy the payment link (e.g., `https://gateway.io/checkout/ps_abc123`)
2. Share via:
   - Email
   - SMS
   - Social media
   - Embed on your website

### Step 5: Get Paid

1. Customer clicks the link
2. Customer connects their wallet (MetaMask or mobile wallet)
3. Customer approves the payment
4. Payment confirmed in 30-120 seconds
5. Funds appear in your wallet
6. You receive email notification

**That's it!** No coding required.

---

## Method 2: JavaScript SDK (Frontend)

Perfect for: SaaS apps, e-commerce sites, web apps

### Step 1: Install SDK

```bash
npm install @stablecoin-gateway/sdk
```

### Step 2: Get API Key

1. Go to [Dashboard → API Keys](https://gateway.io/dashboard/api-keys)
2. Click **Create API Key**
3. Copy your API key (starts with `sk_live_...`)
4. Store it securely (never commit to git)

### Step 3: Initialize SDK

```typescript
import { StablecoinGateway } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway({
  apiKey: 'sk_live_your_api_key', // Use environment variable
  network: 'polygon', // or 'ethereum'
});
```

### Step 4: Create Payment Session

```typescript
// When user clicks "Pay with Crypto" button
async function handlePayment() {
  try {
    const payment = await gateway.createPaymentSession({
      amount: 100, // USD amount
      currency: 'USD',
      network: 'polygon',
      token: 'USDC',
      description: 'Order #1234',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });

    // Redirect customer to hosted checkout
    window.location.href = payment.checkout_url;
    // https://gateway.io/checkout/ps_abc123
  } catch (error) {
    console.error('Payment creation failed:', error);
    alert('Failed to create payment. Please try again.');
  }
}
```

### Step 5: Handle Payment Success

**Option A: Redirect URL**

```typescript
const payment = await gateway.createPaymentSession({
  amount: 100,
  // ... other fields
  success_url: 'https://yoursite.com/order/success',
  cancel_url: 'https://yoursite.com/order/cancel',
});
```

After payment, customer is redirected to your success URL with query params:
```
https://yoursite.com/order/success?payment_id=ps_abc123&status=completed
```

**Option B: Webhooks** (recommended)

See [Webhook Integration Guide](./webhook-integration.md) for setup.

### Step 6: Check Payment Status

```typescript
const payment = await gateway.getPaymentSession('ps_abc123');

console.log(payment.status);
// "pending" | "confirming" | "completed" | "failed" | "expired"

if (payment.status === 'completed') {
  // Payment successful! Fulfill order
  fulfillOrder(payment.id);
}
```

### Complete Example

```typescript
import { StablecoinGateway } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway({
  apiKey: process.env.STABLECOIN_GATEWAY_API_KEY,
  network: 'polygon',
});

// Create payment button
document.getElementById('pay-button').addEventListener('click', async () => {
  try {
    // Create payment session
    const payment = await gateway.createPaymentSession({
      amount: 99.99,
      currency: 'USD',
      network: 'polygon',
      token: 'USDC',
      description: 'Premium Subscription - Annual',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      success_url: 'https://yoursite.com/success',
      cancel_url: 'https://yoursite.com/cancel',
    });

    // Redirect to checkout
    window.location.href = payment.checkout_url;
  } catch (error) {
    console.error('Payment error:', error);
    alert('Failed to initiate payment. Please try again.');
  }
});

// On success page, verify payment
const params = new URLSearchParams(window.location.search);
const paymentId = params.get('payment_id');

if (paymentId) {
  const payment = await gateway.getPaymentSession(paymentId);

  if (payment.status === 'completed') {
    console.log('Payment successful!');
    console.log('Transaction hash:', payment.tx_hash);
    console.log('Amount:', payment.amount);
  }
}
```

---

## Method 3: REST API (Backend)

Perfect for: Custom integrations, mobile apps, complex workflows

### Step 1: Get API Key

Same as Method 2 - get your API key from the dashboard.

### Step 2: Create Payment Session

**Request**:
```bash
curl -X POST https://api.gateway.io/v1/payment-sessions \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "description": "Order #1234",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "success_url": "https://yoursite.com/success",
    "cancel_url": "https://yoursite.com/cancel"
  }'
```

**Response**:
```json
{
  "id": "ps_abc123",
  "checkout_url": "https://gateway.io/checkout/ps_abc123",
  "status": "pending",
  "amount": 100,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "description": "Order #1234",
  "expires_at": "2026-02-03T10:00:00Z",
  "created_at": "2026-01-27T10:00:00Z"
}
```

### Step 3: Redirect Customer to Checkout

In your backend code (Node.js example):

```typescript
import express from 'express';

const app = express();

app.post('/create-payment', async (req, res) => {
  const { orderId, amount } = req.body;

  const response = await fetch('https://api.gateway.io/v1/payment-sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STABLECOIN_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'USD',
      network: 'polygon',
      token: 'USDC',
      description: `Order #${orderId}`,
      merchant_address: process.env.MERCHANT_WALLET_ADDRESS,
      success_url: `https://yoursite.com/orders/${orderId}/success`,
      cancel_url: `https://yoursite.com/orders/${orderId}/cancel`,
    }),
  });

  const payment = await response.json();

  // Return checkout URL to frontend
  res.json({ checkout_url: payment.checkout_url });
});
```

### Step 4: Verify Payment Status

```typescript
app.get('/orders/:orderId/success', async (req, res) => {
  const { payment_id } = req.query;

  const response = await fetch(
    `https://api.gateway.io/v1/payment-sessions/${payment_id}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.STABLECOIN_GATEWAY_API_KEY}`,
      },
    }
  );

  const payment = await response.json();

  if (payment.status === 'completed') {
    // Update order in database
    await db.orders.update({
      where: { id: req.params.orderId },
      data: { status: 'paid', tx_hash: payment.tx_hash },
    });

    res.render('success', { payment });
  } else {
    res.render('pending', { payment });
  }
});
```

See [API Reference](../api-contract.yml) for complete endpoint documentation.

---

## Network Selection: Polygon vs Ethereum

| Network | Gas Fee | Confirmation Time | When to Use |
|---------|---------|-------------------|-------------|
| **Polygon** | $0.01 - $0.50 | ~2 minutes | Recommended for most payments |
| **Ethereum** | $5 - $50 | ~30 seconds | Large payments only (>$1000) |

**Recommendation**: Use Polygon for 99% of payments to save on gas fees.

---

## Token Selection: USDC vs USDT

| Token | Market Cap | Backing | When to Use |
|-------|-----------|---------|-------------|
| **USDC** | $40B | Fully reserved (1:1 USD) | Recommended (more trusted) |
| **USDT** | $100B | Partially backed | If customer prefers USDT |

**Recommendation**: Default to USDC, allow customers to choose.

---

## Testing Your Integration

### Sandbox Environment

Test your integration without real money:

1. Switch to sandbox mode in dashboard
2. Use sandbox API key: `sk_test_...`
3. Use Polygon Mumbai testnet
4. Get test tokens from [Mumbai Faucet](https://faucet.polygon.technology/)

**Sandbox API URL**: `https://api-sandbox.gateway.io`

### Test Payment Flow

1. Create payment session with sandbox API key
2. Open checkout URL in browser
3. Connect MetaMask (switch to Polygon Mumbai)
4. Approve test transaction
5. Verify payment status changes to `completed`

See [Testing Guide](./testing-guide.md) for detailed instructions.

---

## Best Practices

### 1. Always Use Environment Variables

Never hardcode API keys:

```typescript
// ✅ Good
const apiKey = process.env.STABLECOIN_GATEWAY_API_KEY;

// ❌ Bad
const apiKey = 'sk_live_abc123...';
```

### 2. Use Webhooks for Reliability

Don't rely on redirect URLs alone. Use webhooks to handle payment confirmations:

- Redirects can fail (user closes browser, network error)
- Webhooks are retried automatically
- Webhooks are more secure (signed with HMAC)

See [Webhook Integration Guide](./webhook-integration.md).

### 3. Handle Payment Expiration

Payment links expire after 7 days by default. Check expiration:

```typescript
const payment = await gateway.getPaymentSession('ps_abc123');

if (new Date(payment.expires_at) < new Date()) {
  console.log('Payment expired. Create a new one.');
}
```

### 4. Display Gas Fees to Customers

Let customers know they'll pay a small gas fee (~$0.01 on Polygon):

```
Payment Amount: $100.00 USDC
Network Fee: ~$0.01 (paid by customer)
Total: $100.01
```

### 5. Store Transaction Hash

Always store the blockchain transaction hash for auditing:

```typescript
const payment = await gateway.getPaymentSession('ps_abc123');

await db.orders.update({
  where: { id: orderId },
  data: {
    status: 'paid',
    tx_hash: payment.tx_hash, // ← Store this!
    network: payment.network,
  },
});
```

You can verify payments on blockchain explorers:
- Polygon: `https://polygonscan.com/tx/${tx_hash}`
- Ethereum: `https://etherscan.io/tx/${tx_hash}`

---

## Troubleshooting

### Payment Link Doesn't Work

**Problem**: "Payment session not found" error

**Solution**:
- Check payment hasn't expired (7-day default)
- Verify payment ID is correct
- Check network status: [status.gateway.io](https://status.gateway.io)

### Customer Can't Connect Wallet

**Problem**: MetaMask doesn't open

**Solution**:
- Ensure customer has MetaMask installed
- Try WalletConnect for mobile wallets
- Check browser console for errors

### Payment Stuck in "Confirming"

**Problem**: Status doesn't change to "completed"

**Solution**:
- Wait 2-3 minutes (blockchain confirmation time)
- Check transaction on blockchain explorer
- Verify customer approved transaction in wallet
- Contact support if stuck > 10 minutes

See [Troubleshooting Guide](./troubleshooting.md) for more issues.

---

## Next Steps

- ✅ **Integrate payment creation** (you're here)
- ⏭️ **Set up webhooks** - [Webhook Integration Guide](./webhook-integration.md)
- ⏭️ **Test your integration** - [Testing Guide](./testing-guide.md)
- ⏭️ **Go live** - Switch from sandbox to production API key

## Support

- **Email**: support@gateway.io
- **Documentation**: https://docs.gateway.io
- **Community**: https://community.gateway.io
- **Status**: https://status.gateway.io

---

**Last Updated**: 2026-01-27
