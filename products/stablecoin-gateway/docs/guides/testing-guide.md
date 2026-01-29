# Testing Guide

This guide covers how to test your Stablecoin Gateway integration in sandbox mode before going live.

## Overview

Stablecoin Gateway provides a full sandbox environment for testing:

- ✅ Separate API endpoints (api-sandbox.gateway.io)
- ✅ Test API keys (sk_test_...)
- ✅ Polygon Mumbai testnet (free test tokens)
- ✅ No real money involved
- ✅ Same behavior as production

---

## Step 1: Get Sandbox API Key

1. Go to [Dashboard → API Keys](https://gateway.io/dashboard/api-keys)
2. Click **Create API Key**
3. Select **Test Mode**
4. Copy your test API key (starts with `sk_test_...`)

---

## Step 2: Configure Test Environment

### Environment Variables

```bash
# .env.test
STABLECOIN_GATEWAY_API_KEY=sk_test_abc123...
STABLECOIN_GATEWAY_API_URL=https://api-sandbox.gateway.io
MERCHANT_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### SDK Configuration

```typescript
import { StablecoinGateway } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway({
  apiKey: process.env.STABLECOIN_GATEWAY_API_KEY, // sk_test_...
  baseURL: 'https://api-sandbox.gateway.io', // Sandbox URL
  network: 'mumbai', // Polygon testnet
});
```

---

## Step 3: Set Up Test Wallet

### Install MetaMask

1. Install [MetaMask browser extension](https://metamask.io/)
2. Create a new wallet (or use existing)
3. **Important**: Use a separate wallet for testing (not your real funds)

### Add Polygon Mumbai Network

1. Open MetaMask
2. Click network dropdown at top
3. Click **Add Network**
4. Enter network details:

```
Network Name: Polygon Mumbai
RPC URL: https://rpc-mumbai.maticvigil.com
Chain ID: 80001
Currency Symbol: MATIC
Block Explorer: https://mumbai.polygonscan.com
```

5. Click **Save**
6. Switch to Polygon Mumbai network

### Get Test Tokens

**Step 1: Get Test MATIC** (for gas fees)

1. Go to [Polygon Faucet](https://faucet.polygon.technology/)
2. Enter your wallet address
3. Click **Submit**
4. Receive 0.1 MATIC (~$0.05) in 1-2 minutes

**Step 2: Get Test USDC**

1. Go to [Stablecoin Gateway Test Faucet](https://gateway.io/faucet)
2. Connect MetaMask (Mumbai network)
3. Click **Get 100 Test USDC**
4. Receive test USDC in 1-2 minutes

Alternatively, use [Aave V3 Faucet](https://staging.aave.com/faucet/):
- Connect wallet
- Mint test USDC

---

## Step 4: Test Payment Flow

### Create Test Payment

```typescript
const payment = await gateway.createPaymentSession({
  amount: 10.00,
  currency: 'USD',
  network: 'mumbai', // Testnet
  token: 'USDC',
  description: 'Test Order #1234',
  merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  success_url: 'http://localhost:3000/success',
  cancel_url: 'http://localhost:3000/cancel',
});

console.log('Checkout URL:', payment.checkout_url);
// https://sandbox.gateway.io/checkout/ps_test_abc123
```

### Complete Test Payment

1. Open `payment.checkout_url` in browser
2. MetaMask popup appears
3. Click **Connect**
4. Approve wallet connection
5. Click **Pay with USDC**
6. MetaMask transaction popup appears
7. Review transaction details:
   - **To**: Merchant address
   - **Amount**: 10 USDC
   - **Network**: Polygon Mumbai
   - **Gas Fee**: ~$0.01 MATIC
8. Click **Confirm**
9. Wait 1-2 minutes for confirmation
10. Status changes to "Complete"

### Verify Payment Status

```typescript
const payment = await gateway.getPaymentSession('ps_test_abc123');

console.log('Status:', payment.status);
// "completed"

console.log('Transaction Hash:', payment.tx_hash);
// 0xabc123...

// Verify on blockchain explorer
const explorerUrl = `https://mumbai.polygonscan.com/tx/${payment.tx_hash}`;
console.log('View on Explorer:', explorerUrl);
```

---

## Step 5: Test Webhook Integration

### Set Up Test Webhook

```typescript
// Use ngrok to expose local server
// ngrok http 3000
// Forwarding: https://abc123.ngrok.io -> localhost:3000

const webhook = await gateway.createWebhook({
  url: 'https://abc123.ngrok.io/webhooks/stablecoin-gateway',
  events: ['payment.completed', 'payment.failed'],
  description: 'Test webhook',
});

console.log('Webhook ID:', webhook.id);
console.log('Webhook Secret:', webhook.secret); // whsec_test_...
```

### Test Webhook Delivery

1. Create test payment (as above)
2. Complete payment in checkout
3. Check your webhook endpoint logs
4. Verify webhook received:

```json
{
  "id": "evt_test_abc123",
  "type": "payment.completed",
  "created_at": "2026-01-27T10:00:00Z",
  "data": {
    "payment_session_id": "ps_test_abc123",
    "amount": 10.00,
    "status": "completed",
    "tx_hash": "0xabc123...",
    "network": "mumbai"
  }
}
```

### Test Webhook Signature Verification

```typescript
import crypto from 'crypto';

function verifyTestWebhook(rawBody: string, signature: string, timestamp: string): boolean {
  const webhookSecret = 'whsec_test_...'; // From webhook creation

  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In webhook handler
if (!verifyTestWebhook(rawBody, signature, timestamp)) {
  console.error('❌ Signature verification failed');
} else {
  console.log('✅ Signature verified');
}
```

---

## Test Scenarios

### Scenario 1: Successful Payment

**Steps**:
1. Create payment session
2. Customer connects wallet
3. Customer approves transaction
4. Payment confirms in 1-2 minutes

**Expected**:
- Status: `pending` → `confirming` → `completed`
- Webhook: `payment.completed` received
- Transaction visible on [Mumbai PolygonScan](https://mumbai.polygonscan.com/)

**Verify**:
```typescript
const payment = await gateway.getPaymentSession(paymentId);
expect(payment.status).toBe('completed');
expect(payment.tx_hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
expect(payment.confirmed_at).toBeDefined();
```

---

### Scenario 2: Failed Payment (Rejected)

**Steps**:
1. Create payment session
2. Customer connects wallet
3. Customer clicks **Reject** in MetaMask

**Expected**:
- Status remains `pending`
- No transaction created
- Customer can try again

**Verify**:
```typescript
const payment = await gateway.getPaymentSession(paymentId);
expect(payment.status).toBe('pending');
expect(payment.tx_hash).toBeNull();
```

---

### Scenario 3: Insufficient Balance

**Steps**:
1. Empty test wallet (send all USDC away)
2. Create payment session for 10 USDC
3. Try to pay

**Expected**:
- Checkout shows "Insufficient balance" error
- Pay button disabled
- Helpful message displayed

**Verify**:
- Check MetaMask: balance < payment amount
- Checkout UI shows error message
- Transaction cannot be submitted

---

### Scenario 4: Payment Expiration

**Steps**:
1. Create payment session
2. Wait 7 days (or set custom expiration)
3. Try to access checkout URL

**Expected**:
- Status: `expired`
- Checkout shows "Payment link expired"
- Cannot complete payment

**Verify**:
```typescript
const payment = await gateway.getPaymentSession(paymentId);
expect(payment.status).toBe('expired');
expect(new Date(payment.expires_at) < new Date()).toBe(true);
```

---

### Scenario 5: Network Mismatch

**Steps**:
1. Create payment for Polygon Mumbai
2. Customer's MetaMask is on Ethereum mainnet
3. Try to connect wallet

**Expected**:
- Checkout detects wrong network
- Prompt to switch network
- MetaMask shows network switch popup

**Verify**:
- Checkout shows "Wrong network" message
- "Switch to Polygon Mumbai" button appears
- After switching, payment proceeds normally

---

### Scenario 6: Webhook Retry

**Steps**:
1. Create webhook
2. Stop webhook server (simulate downtime)
3. Complete test payment
4. Start webhook server after 1 minute

**Expected**:
- First delivery fails (server down)
- Gateway retries after 10 seconds
- Gateway retries again after 60 seconds
- Webhook delivered when server back up

**Verify**:
- Check [Dashboard → Webhooks → Deliveries](https://gateway.io/dashboard/webhooks)
- See multiple delivery attempts
- Final attempt shows `200 OK`

---

## Automated Testing

### Unit Tests

Test business logic without blockchain:

```typescript
import { StablecoinGateway } from '@stablecoin-gateway/sdk';

describe('Payment Creation', () => {
  const gateway = new StablecoinGateway({
    apiKey: 'sk_test_abc123',
    baseURL: 'https://api-sandbox.gateway.io',
  });

  it('should create payment session', async () => {
    const payment = await gateway.createPaymentSession({
      amount: 100,
      currency: 'USD',
      network: 'mumbai',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });

    expect(payment.id).toMatch(/^ps_test_/);
    expect(payment.status).toBe('pending');
    expect(payment.checkout_url).toContain('sandbox.gateway.io');
  });

  it('should retrieve payment session', async () => {
    const created = await gateway.createPaymentSession({...});
    const retrieved = await gateway.getPaymentSession(created.id);

    expect(retrieved.id).toBe(created.id);
    expect(retrieved.amount).toBe(100);
  });
});
```

### Integration Tests

Test full payment flow (requires real blockchain interaction):

```typescript
import { test, expect } from '@playwright/test';

test('complete payment flow', async ({ page, context }) => {
  // Install MetaMask extension (Playwright has MetaMask plugin)
  // Or use mock wallet for automated testing

  // 1. Create payment
  const payment = await createTestPayment();

  // 2. Navigate to checkout
  await page.goto(payment.checkout_url);

  // 3. Connect wallet
  await page.click('button:has-text("Connect Wallet")');
  // MetaMask popup handled by plugin

  // 4. Approve payment
  await page.click('button:has-text("Pay with USDC")');
  // MetaMask confirmation handled by plugin

  // 5. Wait for confirmation
  await page.waitForSelector('text=Payment Complete', { timeout: 120000 });

  // 6. Verify payment status
  const status = await getPaymentStatus(payment.id);
  expect(status).toBe('completed');
});
```

See [E2E Testing with MetaMask](https://github.com/synthetixio/synpress) for automated wallet testing.

---

## Testing Checklist

Before going live, verify:

### Payment Flow
- [x] Create payment session (API)
- [x] Access checkout page (URL)
- [x] Connect MetaMask (wallet)
- [x] Switch networks (if needed)
- [x] Check balance (sufficient USDC)
- [x] Approve transaction (MetaMask)
- [x] Wait for confirmation (1-2 min)
- [x] Status updates (pending → confirming → completed)
- [x] Transaction visible on explorer

### Webhook Integration
- [x] Webhook endpoint created
- [x] HTTPS enabled (production)
- [x] Signature verification works
- [x] `payment.completed` received
- [x] `payment.failed` received
- [x] Webhook retries on failure
- [x] Idempotency handling

### Error Handling
- [x] Insufficient balance error
- [x] Wrong network error
- [x] Transaction rejection
- [x] Payment expiration
- [x] Invalid API key
- [x] Rate limiting

### Edge Cases
- [x] Multiple simultaneous payments
- [x] Duplicate payment sessions
- [x] Network congestion (slow confirmations)
- [x] Wallet disconnection during payment
- [x] Browser refresh during payment

---

## Switching to Production

Once testing is complete:

### 1. Get Production API Key

1. Go to [Dashboard → API Keys](https://gateway.io/dashboard/api-keys)
2. Click **Create API Key**
3. Select **Live Mode**
4. Copy production API key (`sk_live_...`)

### 2. Update Environment Variables

```bash
# .env.production
STABLECOIN_GATEWAY_API_KEY=sk_live_abc123...
STABLECOIN_GATEWAY_API_URL=https://api.gateway.io
MERCHANT_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### 3. Switch to Mainnet

```typescript
const gateway = new StablecoinGateway({
  apiKey: process.env.STABLECOIN_GATEWAY_API_KEY, // sk_live_...
  baseURL: 'https://api.gateway.io', // Production
  network: 'polygon', // Mainnet (not mumbai)
});
```

### 4. Update Webhook URLs

- Remove ngrok URLs
- Use production HTTPS URLs
- Update webhook secrets

### 5. Test One Real Payment

**Important**: Test with small amount first ($1-10)

1. Create payment for $5
2. Complete payment with real wallet
3. Verify funds received in merchant wallet
4. Verify webhook received
5. Check dashboard shows payment

---

## Debugging Tools

### Check Payment Status

```bash
curl https://api-sandbox.gateway.io/v1/payment-sessions/ps_test_abc123 \
  -H "Authorization: Bearer sk_test_..."
```

### View Transaction on Explorer

- **Mumbai**: https://mumbai.polygonscan.com/tx/0xabc123...
- **Polygon**: https://polygonscan.com/tx/0xabc123...
- **Ethereum**: https://etherscan.io/tx/0xabc123...

### Check Wallet Balance

```bash
# Using ethers.js
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com');
const usdcAddress = '0x...'; // Test USDC contract
const usdcContract = new ethers.Contract(usdcAddress, [
  'function balanceOf(address) view returns (uint256)'
], provider);

const balance = await usdcContract.balanceOf('0x742d35Cc...');
console.log('Balance:', ethers.formatUnits(balance, 6), 'USDC');
```

### Enable Debug Logs

```typescript
const gateway = new StablecoinGateway({
  apiKey: 'sk_test_...',
  debug: true, // Enable debug logging
});

// Logs all API requests/responses
```

---

## Common Issues

See [Troubleshooting Guide](./troubleshooting.md) for detailed solutions.

---

## Support

- **Email**: support@gateway.io
- **Sandbox Status**: https://status-sandbox.gateway.io
- **Test Faucet**: https://gateway.io/faucet

---

**Last Updated**: 2026-01-27
