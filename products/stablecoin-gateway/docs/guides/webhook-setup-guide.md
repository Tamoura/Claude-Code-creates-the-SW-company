# Webhook Setup Guide

Complete guide to setting up and verifying webhooks for real-time payment notifications.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Creating Webhooks](#creating-webhooks)
4. [Verifying Signatures](#verifying-signatures)
5. [Event Types](#event-types)
6. [Testing Webhooks](#testing-webhooks)
7. [Production Best Practices](#production-best-practices)
8. [Code Examples](#code-examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow your server to receive real-time notifications when events occur in Stablecoin Gateway (e.g., payment completed, payment failed). Instead of polling the API, webhooks push updates to your server instantly.

**Benefits**:
- ✅ Real-time notifications (< 5 seconds after event)
- ✅ No polling required (reduces API calls)
- ✅ Automatic retries with exponential backoff
- ✅ Signed payloads for security (HMAC-SHA256)

**Use Cases**:
- Fulfill orders immediately after payment confirmation
- Send customer confirmation emails
- Update internal databases
- Trigger downstream workflows

---

## Quick Start

### 1. Create a Webhook Endpoint

```bash
curl -X POST https://api.gateway.io/v1/webhooks \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourserver.com/webhooks/stablecoin-gateway",
    "events": ["payment.completed", "payment.failed"],
    "description": "Production webhook"
  }'
```

**Response**:
```json
{
  "id": "wh_abc123",
  "url": "https://yourserver.com/webhooks/stablecoin-gateway",
  "events": ["payment.completed", "payment.failed"],
  "description": "Production webhook",
  "enabled": true,
  "secret": "whsec_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "created_at": "2026-01-29T10:00:00Z"
}
```

**IMPORTANT**: Save the `secret` immediately - it's only shown once and cannot be retrieved later.

### 2. Handle Webhook Requests

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse raw body for signature verification
app.use(
  '/webhooks',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.post('/webhooks/stablecoin-gateway', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const secret = process.env.WEBHOOK_SECRET;

  // Verify signature (see verification section below)
  if (!verifySignature(req.rawBody, signature, timestamp, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  const event = req.body;
  console.log('Received event:', event.type);

  if (event.type === 'payment.completed') {
    const paymentId = event.data.id;
    const amount = event.data.amount;
    // Fulfill order, send confirmation, etc.
    console.log(`Payment ${paymentId} completed: $${amount}`);
  }

  // Return 200 to acknowledge receipt
  res.status(200).send('OK');
});

app.listen(3000);
```

---

## Creating Webhooks

### API Endpoint

**POST** `/v1/webhooks`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | HTTPS endpoint URL (HTTP not allowed) |
| `events` | string[] | Yes | Event types to subscribe to |
| `description` | string | No | Human-readable description |
| `enabled` | boolean | No | Enable/disable webhook (default: true) |

### Available Event Types

| Event | Description |
|-------|-------------|
| `payment.created` | Payment session created |
| `payment.confirming` | Transaction submitted to blockchain |
| `payment.completed` | Payment confirmed on-chain |
| `payment.failed` | Payment failed or timed out |
| `payment.expired` | Payment session expired (24 hours) |
| `refund.completed` | Refund processed successfully |

### Example: Create Webhook

```javascript
const response = await fetch('https://api.gateway.io/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.STABLECOIN_GATEWAY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yourserver.com/webhooks/stablecoin-gateway',
    events: ['payment.completed', 'payment.failed', 'payment.expired'],
    description: 'Production webhook for order fulfillment',
  }),
});

const webhook = await response.json();

// CRITICAL: Save the secret immediately
console.log('Webhook created:', webhook.id);
console.log('Secret (save this):', webhook.secret);

// Store in environment variable or secure vault
// DO NOT commit to version control
```

### Webhook URL Requirements

- ✅ Must use HTTPS (HTTP not allowed for security)
- ✅ Must be publicly accessible
- ✅ Must respond within 10 seconds
- ✅ Must return 2xx status code to acknowledge receipt

---

## Verifying Signatures

All webhook payloads are signed with HMAC-SHA256 to prevent spoofed requests.

### Signature Headers

| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | HMAC-SHA256 hex signature |
| `X-Webhook-Timestamp` | Unix timestamp (seconds) |

### Verification Algorithm

**Signature Scheme**:
```
signature = HMAC-SHA256(secret, timestamp + "." + payload)
```

**Steps**:
1. Extract signature from `X-Webhook-Signature` header
2. Extract timestamp from `X-Webhook-Timestamp` header
3. Verify timestamp is within 5 minutes (prevents replay attacks)
4. Compute expected signature using your secret
5. Compare signatures using constant-time comparison

### Node.js Implementation

```javascript
const crypto = require('crypto');

function verifySignature(rawBody, signature, timestamp, secret) {
  // Step 1: Validate timestamp (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - webhookTime) > 300) {
    console.error('Webhook timestamp too old or too far in future');
    return false; // Reject if > 5 minutes old
  }

  // Step 2: Compute expected signature
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Step 3: Compare signatures (constant-time to prevent timing attacks)
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Python Implementation

```python
import hmac
import hashlib
import time

def verify_signature(raw_body: str, signature: str, timestamp: str, secret: str) -> bool:
    # Step 1: Validate timestamp (prevent replay attacks)
    current_time = int(time.time())
    webhook_time = int(timestamp)

    if abs(current_time - webhook_time) > 300:
        print("Webhook timestamp too old or too far in future")
        return False  # Reject if > 5 minutes old

    # Step 2: Compute expected signature
    payload = f"{timestamp}.{raw_body}"
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Step 3: Compare signatures (constant-time)
    return hmac.compare_digest(signature, expected_signature)
```

### PHP Implementation

```php
<?php
function verifySignature($rawBody, $signature, $timestamp, $secret) {
    // Step 1: Validate timestamp (prevent replay attacks)
    $currentTime = time();
    $webhookTime = intval($timestamp);

    if (abs($currentTime - $webhookTime) > 300) {
        error_log("Webhook timestamp too old or too far in future");
        return false; // Reject if > 5 minutes old
    }

    // Step 2: Compute expected signature
    $payload = $timestamp . "." . $rawBody;
    $expectedSignature = hash_hmac('sha256', $payload, $secret);

    // Step 3: Compare signatures (constant-time)
    return hash_equals($signature, $expectedSignature);
}
?>
```

### Security Best Practices

**DO**:
- ✅ Always verify signatures before processing webhook
- ✅ Use constant-time comparison to prevent timing attacks
- ✅ Validate timestamp to prevent replay attacks
- ✅ Store webhook secret in environment variables, not code
- ✅ Use different secrets for production and staging

**DON'T**:
- ❌ Trust webhook data without signature verification
- ❌ Use simple string comparison (`===`) for signatures
- ❌ Ignore timestamp validation
- ❌ Commit webhook secrets to version control
- ❌ Reuse secrets across environments

---

## Event Types

### payment.completed

Payment confirmed on blockchain.

**Payload**:
```json
{
  "id": "evt_abc123",
  "type": "payment.completed",
  "created_at": "2026-01-29T10:02:15Z",
  "data": {
    "id": "ps_abc123",
    "amount": 100.00,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "status": "completed",
    "customer_address": "0x123...",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "tx_hash": "0xabc...",
    "block_number": 12345678,
    "confirmations": 64,
    "confirmed_at": "2026-01-29T10:02:15Z",
    "metadata": {
      "order_id": "1234"
    }
  },
  "timestamp": 1706530935,
  "signature": "a8b7c6d5e4f3..."
}
```

**Use Case**: Fulfill order, send confirmation email, update database.

---

### payment.failed

Payment failed or timed out.

**Payload**:
```json
{
  "id": "evt_def456",
  "type": "payment.failed",
  "created_at": "2026-01-29T10:30:00Z",
  "data": {
    "id": "ps_xyz789",
    "amount": 50.00,
    "currency": "USD",
    "status": "failed",
    "failure_reason": "insufficient_balance",
    "metadata": {
      "order_id": "5678"
    }
  },
  "timestamp": 1706532600,
  "signature": "..."
}
```

**Use Case**: Cancel order, notify customer, free inventory.

---

### payment.expired

Payment session expired (24-hour timeout).

**Payload**:
```json
{
  "id": "evt_ghi789",
  "type": "payment.expired",
  "created_at": "2026-01-30T10:00:00Z",
  "data": {
    "id": "ps_old123",
    "amount": 75.00,
    "currency": "USD",
    "status": "expired",
    "expires_at": "2026-01-30T10:00:00Z"
  },
  "timestamp": 1706616000,
  "signature": "..."
}
```

**Use Case**: Cancel order, free inventory.

---

## Testing Webhooks

### Local Testing with ngrok

Expose your local server to the internet for webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your local server
node server.js  # Listening on port 3000

# Expose it publicly
ngrok http 3000
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

**Create webhook with ngrok URL**:
```bash
curl -X POST https://api-sandbox.gateway.io/v1/webhooks \
  -H "Authorization: Bearer sk_test_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abc123.ngrok.io/webhooks/stablecoin-gateway",
    "events": ["payment.completed"]
  }'
```

### Testing with webhook.site

For quick testing without writing code:

1. Go to [webhook.site](https://webhook.site)
2. Copy your unique URL (e.g., `https://webhook.site/abc-123`)
3. Create webhook with this URL
4. Trigger test payment
5. View webhook payloads in webhook.site interface

### Manual Testing

Trigger test webhook manually:

```bash
# Create test payment session
curl -X POST https://api-sandbox.gateway.io/v1/payment-sessions \
  -H "Authorization: Bearer sk_test_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "currency": "USD",
    "network": "polygon-mumbai",
    "token": "USDC",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# Complete the payment in sandbox
# Your webhook will be called automatically
```

---

## Production Best Practices

### 1. Idempotency

Process each webhook event only once, even if received multiple times.

```javascript
const processedEvents = new Set();

app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  const event = req.body;

  // Check if already processed
  if (processedEvents.has(event.id)) {
    console.log('Event already processed:', event.id);
    return res.status(200).send('OK');
  }

  // Process event
  await processEvent(event);

  // Mark as processed
  processedEvents.add(event.id);

  res.status(200).send('OK');
});
```

**Better approach**: Use database to track processed events (survives server restarts).

```javascript
// Check database
const existing = await db.webhookEvents.findOne({ eventId: event.id });
if (existing) {
  return res.status(200).send('OK');
}

// Process and record
await processEvent(event);
await db.webhookEvents.create({ eventId: event.id, processedAt: new Date() });
```

---

### 2. Async Processing

Process webhooks asynchronously to respond quickly.

```javascript
const queue = require('bull');
const webhookQueue = new queue('webhooks');

app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  // Verify signature first
  if (!verifySignature(req.rawBody, signature, timestamp, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Queue for processing (respond immediately)
  await webhookQueue.add(req.body);

  // Acknowledge receipt within 10 seconds
  res.status(200).send('OK');
});

// Process in background
webhookQueue.process(async (job) => {
  const event = job.data;
  await processEvent(event);
});
```

---

### 3. Error Handling

Handle errors gracefully to allow automatic retries.

```javascript
app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  try {
    // Verify signature
    if (!verifySignature(req.rawBody, signature, timestamp, secret)) {
      return res.status(401).send('Invalid signature');
    }

    // Process event
    await processEvent(req.body);

    // Success
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Return 5xx to trigger retry
    res.status(500).send('Internal server error');
  }
});
```

**Retry Schedule**:
| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | +10 seconds |
| 3 | +60 seconds |
| 4 | +600 seconds (10 minutes) |

---

### 4. Monitoring

Monitor webhook deliveries and failures.

```javascript
const webhookMetrics = {
  received: 0,
  processed: 0,
  failed: 0,
};

app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  webhookMetrics.received++;

  try {
    await processEvent(req.body);
    webhookMetrics.processed++;
    res.status(200).send('OK');
  } catch (error) {
    webhookMetrics.failed++;
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Alert if failure rate > 10%
setInterval(() => {
  const failureRate = webhookMetrics.failed / webhookMetrics.received;
  if (failureRate > 0.1) {
    console.error('High webhook failure rate:', failureRate);
    // Send alert to monitoring system
  }
}, 60000); // Check every minute
```

---

### 5. Security Checklist

Before going live:

- [ ] Webhook URL uses HTTPS (not HTTP)
- [ ] Signature verification implemented
- [ ] Timestamp validation implemented (5-minute window)
- [ ] Webhook secret stored in environment variable
- [ ] Different secrets for production and staging
- [ ] Processed events tracked (idempotency)
- [ ] Async processing for fast response
- [ ] Error handling for automatic retries
- [ ] Monitoring and alerting configured
- [ ] Tested with real sandbox payments

---

## Code Examples

### Complete Express.js Example

```javascript
const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Parse raw body for signature verification
app.use(
  '/webhooks',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

// Verify webhook signature
function verifySignature(rawBody, signature, timestamp, secret) {
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - webhookTime) > 300) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Process webhook event
async function processEvent(event) {
  console.log('Processing event:', event.type);

  if (event.type === 'payment.completed') {
    const payment = event.data;

    // Update order status
    await db.query(
      'UPDATE orders SET status = $1, payment_id = $2, paid_at = NOW() WHERE id = $3',
      ['paid', payment.id, payment.metadata.order_id]
    );

    // Send confirmation email
    // await sendEmail(payment.metadata.customer_email, 'Payment confirmed');

    console.log(`Order ${payment.metadata.order_id} fulfilled`);
  } else if (event.type === 'payment.failed') {
    const payment = event.data;

    // Cancel order
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['cancelled', payment.metadata.order_id]
    );

    console.log(`Order ${payment.metadata.order_id} cancelled`);
  }
}

// Webhook endpoint
app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const secret = process.env.WEBHOOK_SECRET;

  // Verify signature
  if (!verifySignature(req.rawBody, signature, timestamp, secret)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  // Check if already processed (idempotency)
  const existing = await db.query(
    'SELECT id FROM webhook_events WHERE event_id = $1',
    [event.id]
  );

  if (existing.rows.length > 0) {
    console.log('Event already processed:', event.id);
    return res.status(200).send('OK');
  }

  try {
    // Process event
    await processEvent(event);

    // Record as processed
    await db.query(
      'INSERT INTO webhook_events (event_id, event_type, processed_at) VALUES ($1, $2, NOW())',
      [event.id, event.type]
    );

    // Acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 5xx to trigger automatic retry
    res.status(500).send('Internal server error');
  }
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

---

## Troubleshooting

### Webhook Not Received

**Check 1**: Webhook enabled?
```bash
curl -X GET https://api.gateway.io/v1/webhooks/wh_abc123 \
  -H "Authorization: Bearer sk_live_your_api_key"
```

Look for `"enabled": true` in response.

**Check 2**: URL accessible?
```bash
curl -X POST https://yourserver.com/webhooks/stablecoin-gateway \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Should return 2xx status code.

**Check 3**: HTTPS configured correctly?
- Certificate valid and not expired
- No self-signed certificates in production
- TLS 1.2+ supported

**Check 4**: Server responding within 10 seconds?
- Add timing logs to webhook handler
- Optimize database queries
- Use async processing for slow operations

---

### Signature Verification Failing

**Check 1**: Using raw body?
```javascript
// WRONG: Parsed JSON
const signature = computeSignature(JSON.stringify(req.body));

// CORRECT: Raw body
const signature = computeSignature(req.rawBody);
```

**Check 2**: Correct secret?
```javascript
console.log('Secret length:', process.env.WEBHOOK_SECRET.length);
// Should be 70 characters (whsec_ + 64 hex chars)
```

**Check 3**: Timestamp in signature?
```javascript
// WRONG: Only body
const payload = rawBody;

// CORRECT: Timestamp + body
const payload = `${timestamp}.${rawBody}`;
```

**Check 4**: Constant-time comparison?
```javascript
// WRONG: String comparison (timing attack vulnerability)
return signature === expectedSignature;

// CORRECT: Constant-time comparison
return crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
);
```

---

### Duplicate Events

**Solution**: Implement idempotency using event IDs.

```javascript
const processed = await db.query(
  'SELECT 1 FROM webhook_events WHERE event_id = $1',
  [event.id]
);

if (processed.rows.length > 0) {
  return res.status(200).send('Already processed');
}

// Process and record
await processEvent(event);
await db.query(
  'INSERT INTO webhook_events (event_id) VALUES ($1)',
  [event.id]
);
```

---

### Events Out of Order

**Solution**: Use event timestamps, not arrival order.

```javascript
// Store event timestamp
await db.query(
  'INSERT INTO webhook_events (event_id, event_timestamp) VALUES ($1, $2)',
  [event.id, new Date(event.created_at)]
);

// Process events in chronological order
const events = await db.query(
  'SELECT * FROM webhook_events ORDER BY event_timestamp ASC'
);
```

---

## Support

Need help with webhooks?

- **Documentation**: https://docs.gateway.io/webhooks
- **Email**: support@gateway.io
- **Status Page**: https://status.gateway.io

---

**Last Updated**: 2026-01-29
**Version**: 1.0
