# Stablecoin Gateway - User Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: Stablecoin Gateway
**Status**: Production Ready

---

## Table of Contents

1. [What is Stablecoin Gateway?](#what-is-stablecoin-gateway)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [How to Create a Payment](#how-to-create-a-payment)
5. [How Customers Pay](#how-customers-pay)
6. [Dashboard Overview](#dashboard-overview)
7. [API Integration](#api-integration)
8. [Webhooks](#webhooks)
9. [Pricing](#pricing)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## What is Stablecoin Gateway?

Stablecoin Gateway is a payment platform that lets you accept cryptocurrency payments (USDC and USDT) as easily as using Stripe, but at **10x lower fees**.

### Why Use Stablecoin Gateway?

**Problem**: Credit card fees eat 2-3% of your revenue
- $100,000 in sales = **$3,000 lost to fees**
- $1,000,000 in sales = **$30,000 lost to fees**
- Takes 2-7 days to get paid

**Solution**: Accept stablecoin payments
- **0.5% fee** instead of 3%
- Get paid in **30-120 seconds** instead of days
- No chargebacks (transactions are final)

### Who Should Use This?

**Perfect for**:
- E-commerce stores (Shopify, WooCommerce)
- SaaS companies (subscription billing)
- Digital product sellers (courses, templates, software)
- Service providers (consulting, freelancing)

**Annual Revenue**: $50k - $5M
**Location**: US-based merchants (launching internationally soon)

---

## Getting Started

### Step 1: Create an Account

1. Visit https://gateway.io/signup
2. Enter your email and password
3. Verify your email address
4. Done! You're ready to accept payments

**Time**: 2 minutes

### Step 2: Create Your First Payment

1. Log in to your dashboard
2. Click **"Create Payment Link"**
3. Enter:
   - Amount: $100
   - Description: "Order #1234"
4. Click **"Generate Link"**
5. Copy the link and share it with your customer

**Time**: 30 seconds

### Step 3: Get Paid

1. Customer clicks your payment link
2. Customer connects their crypto wallet (MetaMask)
3. Customer pays with USDC or USDT
4. Money arrives in your wallet in ~2 minutes
5. You receive email notification

**Done!** Money is in your wallet.

---

## Features

### Payment Links
**What**: Shareable links for one-time payments
**How**: Create in dashboard, share via email/SMS
**Best for**: Invoices, one-time sales

### Hosted Checkout
**What**: Beautiful checkout page where customers pay
**How**: Automatically created with each payment link
**Best for**: Clean, professional payment experience

### Real-time Status
**What**: Live updates as payment is confirmed on blockchain
**How**: Dashboard automatically updates, no refresh needed
**Best for**: Tracking payments without checking your wallet

### Email Notifications
**What**: Instant email when payment completes
**How**: Automatic, no setup required
**Best for**: Staying informed without watching the dashboard

### Webhook Notifications
**What**: HTTP callbacks to your server when payment events occur
**How**: Configure webhook URL in settings
**Best for**: Automating order fulfillment, invoicing

### API Integration
**What**: Programmatic payment creation via REST API
**How**: Generate API key, integrate with our SDK
**Best for**: E-commerce platforms, custom integrations

### Multi-Currency Support
**What**: Accept USDC or USDT on Polygon or Ethereum
**How**: Choose network and token when creating payment
**Best for**: Flexibility, lower gas fees (use Polygon)

---

## How to Create a Payment

### Method 1: Payment Link (No Code Required)

1. **Log in** to https://gateway.io/dashboard

2. **Click "Create Payment Link"**

3. **Fill in the form**:
   - **Amount**: $100.00
   - **Description**: Order #1234 - Blue Widget
   - **Network**: Polygon (recommended - lower fees)
   - **Token**: USDC (recommended - most widely used)

4. **Click "Generate Link"**

5. **Copy the link**:
   ```
   https://gateway.io/checkout/ps_abc123
   ```

6. **Share with customer** via:
   - Email
   - SMS
   - Social media
   - Your website

7. **Done!** Wait for payment notification

### Method 2: API Integration (Requires Code)

```javascript
// Install SDK
npm install @stablecoin-gateway/sdk

// Create payment session
import { StablecoinGateway } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway('sk_live_your_api_key');

const payment = await gateway.createPaymentSession({
  amount: 100,
  currency: 'USD',
  network: 'polygon',
  token: 'USDC',
  description: 'Order #1234',
});

console.log(payment.checkout_url);
// https://gateway.io/checkout/ps_abc123
```

See [API Integration](#api-integration) for full guide.

---

## How Customers Pay

### Customer Experience (Step-by-Step)

1. **Customer receives payment link** from you

2. **Opens link** in browser
   - Sees payment details: Amount, your business name, description
   - Sees network and token (e.g., "Pay 100 USDC on Polygon")

3. **Clicks "Connect Wallet"**
   - MetaMask browser extension opens
   - Customer approves wallet connection
   - Wallet address appears on page

4. **Clicks "Pay with USDC"**
   - MetaMask prompts transaction approval
   - Shows gas fee estimate (e.g., $0.05 on Polygon)
   - Customer clicks "Confirm"

5. **Transaction processing**
   - Page shows "Confirming... (1/64 blocks)"
   - Live progress updates automatically
   - Takes 30-120 seconds

6. **Payment complete!**
   - Page shows "Payment Complete! ✓"
   - Customer can close page or be redirected

### What Customers Need

**Required**:
- Crypto wallet (MetaMask browser extension or WalletConnect mobile app)
- Enough USDC/USDT to cover payment amount
- Small amount of MATIC (Polygon) or ETH (Ethereum) for gas fees

**Gas Fees**:
- Polygon: ~$0.01 - $0.50
- Ethereum: ~$5 - $50 (use Polygon for small payments)

### First-Time Customers

If your customer doesn't have USDC yet:

1. **Get a wallet**: Install MetaMask from https://metamask.io
2. **Buy USDC**:
   - Coinbase: Buy USDC, send to MetaMask wallet
   - Moonpay: Buy directly in MetaMask
3. **Pay**: Click your payment link, follow steps above

**Time**: 5-10 minutes (first time), 30 seconds (returning)

---

## Dashboard Overview

### Home Screen

**Shows**:
- Total volume today/this week/this month
- Recent payments (last 10)
- Quick actions: Create payment link, view all payments

### Payments Page

**Shows**:
- All payments in table format
- Columns: Date, Amount, Status, Transaction Hash
- Filters: All, Pending, Completed, Failed, Refunded
- Search: By description or transaction hash
- Export: Download as CSV

**Actions**:
- Click payment → View details
- Click "Issue Refund" → Refund customer
- Click transaction hash → View on blockchain explorer

### Settings Page

**Sections**:
1. **Account**
   - Email address
   - Password change

2. **API Keys**
   - Create API key
   - View existing keys (prefix shown)
   - Revoke keys

3. **Webhooks**
   - Add webhook URL
   - Select events to receive
   - Test webhook delivery
   - View delivery history

4. **Wallet**
   - Your merchant wallet address
   - Balance (for refunds)

---

## API Integration

### Quick Start

1. **Generate API Key**
   - Go to Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Name: "Production Key"
   - Permissions: Read, Write
   - Click "Create"
   - **Copy the key** (only shown once!): `sk_live_abc123xyz...`

2. **Install SDK**
   ```bash
   npm install @stablecoin-gateway/sdk
   ```

3. **Create Payment**
   ```javascript
   import { StablecoinGateway } from '@stablecoin-gateway/sdk';

   const gateway = new StablecoinGateway('sk_live_abc123...');

   const payment = await gateway.createPaymentSession({
     amount: 100,
     currency: 'USD',
     description: 'Order #1234',
   });

   // Redirect customer to checkout
   window.location.href = payment.checkout_url;
   ```

### API Endpoints

**Create Payment Session**:
```http
POST https://api.gateway.io/v1/payment-sessions
Authorization: Bearer sk_live_abc123...
Content-Type: application/json

{
  "amount": 100,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "merchant_address": "0x742d35Cc...",
  "description": "Order #1234"
}
```

**Response**:
```json
{
  "id": "ps_abc123",
  "checkout_url": "https://gateway.io/checkout/ps_abc123",
  "status": "pending",
  "amount": 100,
  "expires_at": "2026-02-03T10:00:00Z"
}
```

**Get Payment Status**:
```http
GET https://api.gateway.io/v1/payment-sessions/ps_abc123
Authorization: Bearer sk_live_abc123...
```

**List Payments**:
```http
GET https://api.gateway.io/v1/payment-sessions?limit=50&status=completed
Authorization: Bearer sk_live_abc123...
```

See [API Reference](../../products/stablecoin-gateway/docs/api-contract.yml) for full documentation.

---

## Webhooks

### What are Webhooks?

Webhooks are HTTP callbacks that notify your server when payment events occur. Use them to automate order fulfillment.

### Setup

1. **Go to Dashboard → Settings → Webhooks**
2. **Click "Add Webhook"**
3. **Enter your URL**: `https://yoursite.com/webhooks/stablecoin-gateway`
4. **Select events**:
   - `payment.completed` (recommended)
   - `payment.failed`
   - `payment.refunded`
5. **Click "Create"**
6. **Copy webhook secret**: `whsec_xyz789...` (for signature verification)

### Webhook Payload

When a payment completes, we POST to your URL:

```json
{
  "id": "evt_xyz789",
  "type": "payment.completed",
  "created_at": "2026-01-27T10:02:15Z",
  "data": {
    "payment_session_id": "ps_abc123",
    "amount": 100,
    "currency": "USD",
    "status": "completed",
    "tx_hash": "0x123...",
    "confirmed_at": "2026-01-27T10:02:15Z"
  }
}
```

### Verify Signature (Security)

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

// In your webhook handler
app.post('/webhooks/stablecoin-gateway', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  if (!verifyWebhook(payload, signature, 'whsec_xyz789...')) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  if (payload.type === 'payment.completed') {
    fulfillOrder(payload.data.payment_session_id);
  }

  res.status(200).send('OK');
});
```

### Retry Policy

If your server is down or returns an error:
- **Attempt 1**: Immediate
- **Attempt 2**: +10 seconds
- **Attempt 3**: +60 seconds
- **Attempt 4**: +600 seconds (10 minutes)

After 4 failures, webhook is marked "failed". You can replay it from the dashboard.

---

## Pricing

### Transaction Fee

**0.5% per successful payment**
- No monthly fee
- No setup fee
- No hidden fees

### Examples

| Your Sales | Our Fee | You Keep |
|------------|---------|----------|
| $100 | $0.50 | $99.50 |
| $1,000 | $5.00 | $995.00 |
| $10,000 | $50.00 | $9,950.00 |
| $100,000 | $500.00 | $99,500.00 |

### Cost Comparison

| Provider | Fee | $100k Sales | $1M Sales | Savings |
|----------|-----|-------------|-----------|---------|
| Stripe/PayPal | 2.9% + $0.30 | $3,000 | $30,000 | - |
| Coinbase Commerce | 1% | $1,000 | $10,000 | - |
| **Stablecoin Gateway** | **0.5%** | **$500** | **$5,000** | **$25,000** |

**Save up to $25,000/year on $1M in sales!**

---

## Troubleshooting

### Payment Stuck in "Confirming"

**Cause**: Blockchain confirmation takes time
**Solution**: Wait 30-120 seconds. Polygon takes ~128 seconds for full confirmation.

**If still stuck after 5 minutes**:
1. Check transaction on blockchain explorer (click transaction hash)
2. Verify transaction succeeded
3. If transaction failed, payment will auto-update to "failed"

### Customer Can't Connect Wallet

**Cause**: MetaMask not installed or blocked
**Solution**: Customer should:
1. Install MetaMask from https://metamask.io
2. Allow pop-ups from gateway.io
3. Try refreshing the page

### Payment Failed

**Common Causes**:
- Customer has insufficient USDC balance
- Customer has insufficient gas fees (MATIC/ETH)
- Customer rejected transaction in MetaMask
- Network congestion (rare)

**Solution**:
- Customer should check wallet balance
- Customer should try again
- Payment link remains valid for 7 days

### Webhook Not Receiving Events

**Check**:
1. URL is correct (HTTPS only)
2. Your server is responding with 2xx status code
3. Firewall isn't blocking requests from gateway.io
4. Check webhook delivery history in dashboard

**Test**:
- Use "Test Webhook" button in dashboard
- Check your server logs

---

## FAQ

### Q: What are stablecoins?

**A**: Stablecoins are cryptocurrencies pegged to the US dollar. 1 USDC = $1 USD always. They combine crypto's speed and low fees with traditional money's stability (no Bitcoin volatility).

### Q: Do I need to understand crypto?

**A**: No! We handle all the complexity. Just create payment links and get paid. Your customers need a crypto wallet, but the process is as simple as PayPal.

### Q: Where does the money go?

**A**: Directly to your wallet. We're non-custodial - we never hold your funds.

### Q: Can customers pay with Bitcoin or Ethereum?

**A**: No, only USDC and USDT (stablecoins). This avoids price volatility.

### Q: What if the customer's payment fails?

**A**: The payment link remains valid for 7 days. They can try again. Failed transactions don't charge them.

### Q: Can I refund a payment?

**A**: Yes! Click "Issue Refund" on any completed payment. Refunds are processed within minutes.

### Q: What's the difference between Polygon and Ethereum?

**A**: Both are blockchain networks:
- **Polygon**: Lower fees ($0.01-$0.50), faster (~128 seconds). **Recommended for most payments.**
- **Ethereum**: Higher fees ($5-$50), slower (~36 seconds). Use for large payments only.

### Q: Are there chargebacks?

**A**: No. Blockchain transactions are irreversible. This protects you from fraud, but you should only refund legitimate requests.

### Q: How do I get my money into my bank account?

**A**: You can:
1. Use a crypto exchange (Coinbase, Kraken) to convert USDC to USD
2. Send to your exchange account, sell for USD, withdraw to bank
3. (Coming soon) We'll offer automatic conversion to bank account

### Q: Is this legal?

**A**: Yes. We comply with all applicable regulations. You're responsible for complying with regulations in your jurisdiction.

### Q: What if I need help?

**A**: Contact support@gateway.io or visit https://docs.gateway.io

---

## Next Steps

### For New Users
1. ✅ Create account at https://gateway.io/signup
2. ✅ Create your first payment link
3. ✅ Test with a small payment
4. ✅ Set up webhooks (if using API)
5. ✅ Start accepting payments!

### For Developers
1. Read [Technical Manual](./stablecoin-gateway-technical-manual.md)
2. Review [API Documentation](../../products/stablecoin-gateway/docs/api-contract.yml)
3. Integrate with our SDK
4. Test in sandbox environment
5. Deploy to production

### For Feedback
- Email: support@gateway.io
- Documentation: https://docs.gateway.io
- Community: https://community.gateway.io

---

**End of User Manual**
