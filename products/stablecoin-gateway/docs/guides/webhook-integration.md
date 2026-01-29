# Webhook Integration Guide

Webhooks allow you to receive real-time notifications when payment events occur. This guide shows you how to set up and verify webhook endpoints.

## Why Use Webhooks?

**Don't rely on redirect URLs alone**. Webhooks are more reliable because:

- ✅ Automatic retries if your server is down
- ✅ Work even if customer closes browser
- ✅ Cryptographically signed (HMAC) for security
- ✅ Real-time notifications (< 5 seconds)
- ✅ Can trigger automated workflows

---

## Webhook Events

Stablecoin Gateway sends the following events:

| Event | Description | When It Fires |
|-------|-------------|---------------|
| `payment.created` | Payment session created | Immediately after creation |
| `payment.confirming` | Transaction detected on blockchain | Customer approved transaction |
| `payment.completed` | Payment confirmed (3+ blocks) | After blockchain confirmation |
| `payment.failed` | Payment failed or expired | Transaction reverted or link expired |
| `payment.refunded` | Refund processed | After merchant issues refund |

---

## Step 1: Create Webhook Endpoint

Create an endpoint on your server that accepts POST requests.

### Node.js + Express Example

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

// IMPORTANT: Use raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/stablecoin-gateway', (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const rawBody = req.body.toString('utf-8');

  // Verify signature (see Step 3)
  if (!verifySignature(rawBody, signature, timestamp)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse body
  const event = JSON.parse(rawBody);

  // Handle event
  switch (event.type) {
    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;
    case 'payment.failed':
      handlePaymentFailed(event.data);
      break;
    case 'payment.refunded':
      handlePaymentRefunded(event.data);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  // Always return 200 (or Gateway will retry)
  res.status(200).json({ received: true });
});

app.listen(3000);
```

### Python + Flask Example

```python
from flask import Flask, request
import hmac
import hashlib
import time

app = Flask(__name__)

@app.route('/webhooks/stablecoin-gateway', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')
    raw_body = request.get_data()

    # Verify signature
    if not verify_signature(raw_body, signature, timestamp):
        return {'error': 'Invalid signature'}, 401

    # Parse event
    event = request.get_json()

    # Handle event
    if event['type'] == 'payment.completed':
        handle_payment_completed(event['data'])
    elif event['type'] == 'payment.failed':
        handle_payment_failed(event['data'])
    elif event['type'] == 'payment.refunded':
        handle_payment_refunded(event['data'])

    return {'received': True}, 200

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Step 2: Register Webhook in Dashboard

1. Go to [Dashboard → Webhooks](https://gateway.io/dashboard/webhooks)
2. Click **Add Webhook Endpoint**
3. Fill in the form:
   - **URL**: `https://yourserver.com/webhooks/stablecoin-gateway`
   - **Events**: Select events you want to receive
   - **Description**: `Production webhook` (optional)
4. Click **Create**
5. Copy your **Webhook Secret** (starts with `whsec_...`)
6. Store it securely (you'll need it for signature verification)

**Important**: Your webhook endpoint must:
- Be publicly accessible (HTTPS required in production)
- Return `200 OK` within 10 seconds
- Not perform long-running operations (use background jobs)

---

## Step 3: Verify Webhook Signatures

**Always verify signatures** to ensure webhooks are from Stablecoin Gateway.

### Signature Scheme (Stripe-Style)

Our webhook signature scheme prevents timing attacks using **constant-time comparison**:

```
signature = HMAC-SHA256(secret, timestamp + "." + payload)
```

**Security Features**:
- ✅ **Timing-safe comparison** - Uses `crypto.timingSafeEqual()` (Node.js) or `hmac.compare_digest()` (Python) to prevent timing attacks (CWE-208)
- ✅ **Timestamp validation** - Prevents replay attacks (5-minute window)
- ✅ **Raw body signing** - Signs exact bytes received to prevent tampering

**Critical**: Always use constant-time comparison functions. Regular string comparison (`===` or `==`) leaks timing information that attackers can exploit to forge signatures.

**Attack scenario without constant-time comparison**:
1. Attacker tries signature starting with `aXXXXXX...` → Fast rejection (first char wrong)
2. Attacker tries signature starting with `bXXXXXX...` → Slightly slower
3. By measuring response times, attacker identifies correct first character
4. Repeat for all 64 hex characters → Signature forged in ~256 attempts per character

**With constant-time comparison**, all attempts take the same time regardless of how many characters match.

### Verification Code (Node.js)

```typescript
import crypto from 'crypto';

function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET; // whsec_...

  // Check timestamp (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - webhookTime) > 300) {
    // Reject if > 5 minutes old
    console.error('Webhook timestamp too old');
    return false;
  }

  // Compute expected signature
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  // SECURITY: Use constant-time comparison to prevent timing attacks
  // crypto.timingSafeEqual compares all bytes even if first byte differs,
  // preventing attackers from using timing analysis to forge signatures.
  if (signature.length !== expectedSignature.length) {
    return false; // timingSafeEqual requires equal-length buffers
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Verification Code (Python)

```python
import hmac
import hashlib
import time
import os

def verify_signature(raw_body: bytes, signature: str, timestamp: str) -> bool:
    webhook_secret = os.environ['WEBHOOK_SECRET']  # whsec_...

    # Check timestamp
    current_time = int(time.time())
    webhook_time = int(timestamp)

    if abs(current_time - webhook_time) > 300:
        print('Webhook timestamp too old')
        return False

    # Compute expected signature
    payload = f'{timestamp}.{raw_body.decode()}'
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # SECURITY: Use constant-time comparison (hmac.compare_digest)
    # This prevents timing attacks by comparing all characters
    # even if the first character doesn't match.
    return hmac.compare_digest(signature, expected_signature)
```

---

## Step 4: Handle Webhook Events

### Event Payload Structure

```json
{
  "id": "evt_abc123",
  "type": "payment.completed",
  "created_at": "2026-01-27T10:02:15Z",
  "data": {
    "payment_session_id": "ps_xyz789",
    "amount": 100.00,
    "currency": "USD",
    "status": "completed",
    "network": "polygon",
    "token": "USDC",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "customer_address": "0x123...",
    "tx_hash": "0xabc...",
    "block_number": 12345678,
    "confirmed_at": "2026-01-27T10:02:15Z",
    "description": "Order #1234"
  }
}
```

### Handle `payment.completed`

```typescript
async function handlePaymentCompleted(data: any) {
  console.log('Payment completed:', data.payment_session_id);

  try {
    // Update order in database
    await db.orders.update({
      where: { payment_session_id: data.payment_session_id },
      data: {
        status: 'paid',
        tx_hash: data.tx_hash,
        paid_at: new Date(data.confirmed_at),
      },
    });

    // Send confirmation email to customer
    await sendEmail({
      to: order.customer_email,
      subject: 'Payment Confirmed',
      body: `Your payment of ${data.amount} ${data.currency} has been confirmed.`,
    });

    // Fulfill order (ship product, grant access, etc.)
    await fulfillOrder(data.payment_session_id);

    console.log('Order fulfilled successfully');
  } catch (error) {
    console.error('Failed to handle payment completion:', error);
    // Will retry automatically
  }
}
```

### Handle `payment.failed`

```typescript
async function handlePaymentFailed(data: any) {
  console.log('Payment failed:', data.payment_session_id);

  try {
    // Update order status
    await db.orders.update({
      where: { payment_session_id: data.payment_session_id },
      data: { status: 'failed' },
    });

    // Notify customer
    await sendEmail({
      to: order.customer_email,
      subject: 'Payment Failed',
      body: 'Your payment could not be processed. Please try again.',
    });
  } catch (error) {
    console.error('Failed to handle payment failure:', error);
  }
}
```

### Handle `payment.refunded`

```typescript
async function handlePaymentRefunded(data: any) {
  console.log('Payment refunded:', data.payment_session_id);

  try {
    // Update order status
    await db.orders.update({
      where: { payment_session_id: data.payment_session_id },
      data: {
        status: 'refunded',
        refund_tx_hash: data.refund_tx_hash,
        refunded_at: new Date(data.refunded_at),
      },
    });

    // Notify customer
    await sendEmail({
      to: order.customer_email,
      subject: 'Refund Processed',
      body: `Your refund of ${data.amount} ${data.currency} has been processed.`,
    });
  } catch (error) {
    console.error('Failed to handle refund:', error);
  }
}
```

---

## Step 5: Test Webhooks Locally

### Option A: ngrok (Recommended)

Expose your local server to the internet:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your server
node server.js  # Running on port 3000

# Expose to internet
ngrok http 3000
# Forwarding: https://abc123.ngrok.io -> localhost:3000
```

Use the ngrok URL in the webhook configuration:
```
https://abc123.ngrok.io/webhooks/stablecoin-gateway
```

### Option B: Webhook Testing UI

1. Go to [Dashboard → Webhooks](https://gateway.io/dashboard/webhooks)
2. Click on your webhook endpoint
3. Click **Send Test Event**
4. Select event type: `payment.completed`
5. Click **Send**
6. Check your server logs to see if received

---

## Retry Logic

If your webhook endpoint returns an error or times out, Stablecoin Gateway will retry:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | +10 seconds |
| 3 | +60 seconds |
| 4 | +600 seconds (10 minutes) |

After 4 failed attempts, the webhook is marked as failed. You can manually replay it from the dashboard.

**Best Practice**: Always return `200 OK` quickly and process in background.

### Idempotency

Webhooks may be sent multiple times. Handle them idempotently:

```typescript
async function handlePaymentCompleted(data: any) {
  // Check if already processed
  const existing = await db.webhooks.findUnique({
    where: { event_id: data.event_id },
  });

  if (existing) {
    console.log('Webhook already processed:', data.event_id);
    return; // Skip processing
  }

  // Process webhook
  await processPayment(data);

  // Mark as processed
  await db.webhooks.create({
    data: {
      event_id: data.event_id,
      type: 'payment.completed',
      processed_at: new Date(),
    },
  });
}
```

---

## Security Best Practices

### 1. Always Verify Signatures

Never trust webhook data without verification:

```typescript
// ✅ Good
if (!verifySignature(rawBody, signature, timestamp)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
// Process event...

// ❌ Bad - No verification
// Process event directly (vulnerable to spoofing)
```

### 2. Use HTTPS in Production

HTTP webhooks are not allowed in production:

```
❌ http://yourserver.com/webhooks  (rejected)
✅ https://yourserver.com/webhooks (accepted)
```

### 3. Check Timestamp

Reject old webhooks to prevent replay attacks:

```typescript
const currentTime = Math.floor(Date.now() / 1000);
const webhookTime = parseInt(timestamp, 10);

if (Math.abs(currentTime - webhookTime) > 300) {
  // Reject if > 5 minutes old
  return res.status(401).json({ error: 'Webhook too old' });
}
```

### 4. Use Raw Body

Parse JSON AFTER verifying signature:

```typescript
// ✅ Good
app.use('/webhooks', express.raw({ type: 'application/json' }));
const signature = verifySignature(req.body.toString(), ...);
const event = JSON.parse(req.body.toString());

// ❌ Bad - Body already parsed
app.use(express.json());
const signature = verifySignature(req.body, ...); // Won't match!
```

### 5. Store Webhook Secret Securely

Never commit webhook secrets:

```bash
# .env
WEBHOOK_SECRET=whsec_abc123...

# .gitignore
.env
```

---

## Debugging Webhooks

### View Webhook History

1. Go to [Dashboard → Webhooks](https://gateway.io/dashboard/webhooks)
2. Click on your webhook endpoint
3. View **Recent Deliveries** tab
4. See request/response for each attempt

### Common Issues

**"Invalid signature" error**

**Cause**: Body modified before verification

**Solution**:
- Use raw body (not parsed JSON)
- Don't modify body in middleware
- Check webhook secret is correct

**"Webhook timeout" error**

**Cause**: Endpoint took > 10 seconds to respond

**Solution**:
- Return 200 immediately
- Process in background job
- Optimize database queries

**Webhooks not received**

**Cause**: Firewall blocking requests

**Solution**:
- Whitelist Stablecoin Gateway IPs (see dashboard)
- Check server logs for errors
- Test with ngrok

### Enable Debug Logging

```typescript
app.post('/webhooks/stablecoin-gateway', (req, res) => {
  console.log('Webhook received:');
  console.log('- Headers:', req.headers);
  console.log('- Body:', req.body.toString());

  // ... rest of code
});
```

---

## Complete Example

```typescript
import express from 'express';
import crypto from 'crypto';
import { Queue } from 'bullmq';

const app = express();

// Background job queue
const webhookQueue = new Queue('webhooks', {
  connection: { host: 'localhost', port: 6379 },
});

// Raw body parser for webhooks
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Webhook endpoint
app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const rawBody = req.body.toString('utf-8');

  // 1. Verify signature
  if (!verifySignature(rawBody, signature, timestamp)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse event
  const event = JSON.parse(rawBody);
  console.log('Webhook received:', event.type, event.id);

  // 3. Queue for background processing
  await webhookQueue.add('process-webhook', {
    eventId: event.id,
    type: event.type,
    data: event.data,
  });

  // 4. Return 200 immediately
  res.status(200).json({ received: true });
});

// Signature verification
function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET!;

  // Check timestamp
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - webhookTime) > 300) {
    return false;
  }

  // Verify signature
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  // Length check required for timingSafeEqual
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Background worker (in separate file)
import { Worker } from 'bullmq';

const worker = new Worker('webhooks', async (job) => {
  const { eventId, type, data } = job.data;

  // Check if already processed
  const existing = await db.webhooks.findUnique({
    where: { event_id: eventId },
  });

  if (existing) {
    console.log('Already processed:', eventId);
    return;
  }

  // Process event
  switch (type) {
    case 'payment.completed':
      await handlePaymentCompleted(data);
      break;
    case 'payment.failed':
      await handlePaymentFailed(data);
      break;
    case 'payment.refunded':
      await handlePaymentRefunded(data);
      break;
  }

  // Mark as processed
  await db.webhooks.create({
    data: { event_id: eventId, type, processed_at: new Date() },
  });
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

---

## Next Steps

- ✅ **Set up webhook endpoint** (you're here)
- ⏭️ **Test webhook delivery** - [Testing Guide](./testing-guide.md)
- ⏭️ **Monitor webhook health** - [Dashboard → Webhooks](https://gateway.io/dashboard/webhooks)

## Support

- **Email**: support@gateway.io
- **Documentation**: https://docs.gateway.io/webhooks
- **API Reference**: [api-contract.yml](../api-contract.yml)

---

**Last Updated**: 2026-01-29 (FIX-06: Added timing-safe comparison documentation)
