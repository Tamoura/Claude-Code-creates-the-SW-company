# Webhook Signature Verification Guide

This guide explains how to verify webhook signatures sent by the Stablecoin Gateway to ensure they are authentic and haven't been tampered with.

## Overview

All webhooks sent by Stablecoin Gateway include:
- **Timestamp**: Unix timestamp (milliseconds) when the webhook was created
- **Signature**: HMAC-SHA256 signature of the payload

This prevents:
- **Replay attacks**: Old webhooks cannot be replayed (5-minute window)
- **Tampering**: Modified webhooks will fail signature verification
- **Spoofing**: Only Stablecoin Gateway can generate valid signatures

## Webhook Payload Structure

```json
{
  "event": "payment.completed",
  "payment_session_id": "ps_abc123",
  "amount": "100.00",
  "currency": "USDC",
  "tx_hash": "0x123...",
  "timestamp": 1706450400000,
  "signature": "a1b2c3d4e5f6..."
}
```

## Verification Steps

### 1. Extract Signature and Timestamp

```javascript
const { signature, ...dataToVerify } = webhookPayload;
const { timestamp } = webhookPayload;
```

### 2. Verify Timestamp (Replay Protection)

Reject webhooks older than 5 minutes:

```javascript
const now = Date.now();
const age = now - timestamp;

if (age < 0) {
  throw new Error('Webhook timestamp is in the future');
}

if (age > 5 * 60 * 1000) { // 5 minutes
  throw new Error('Webhook timestamp is too old');
}
```

### 3. Verify Signature

Compute the expected signature and compare:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  // 1. Extract signature from payload
  const { signature: receivedSignature, ...dataToVerify } = payload;

  // 2. Generate expected signature
  const payloadString = JSON.stringify(dataToVerify);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  // 3. Compare signatures (timing-safe comparison)
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

// Usage
const isValid = verifyWebhookSignature(
  webhookPayload,
  webhookPayload.signature,
  process.env.WEBHOOK_SECRET
);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

### 4. Complete Verification Function

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, webhookSecret) {
  // Check for required fields
  if (!payload.signature) {
    return { valid: false, error: 'missing_signature' };
  }

  if (!payload.timestamp) {
    return { valid: false, error: 'missing_timestamp' };
  }

  // Verify timestamp
  const now = Date.now();
  const age = now - payload.timestamp;

  if (age < 0 || age > 5 * 60 * 1000) {
    return { valid: false, error: 'invalid_timestamp' };
  }

  // Verify signature
  const { signature, ...dataToVerify } = payload;
  const payloadString = JSON.stringify(dataToVerify);
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  if (expectedSignature !== signature) {
    return { valid: false, error: 'invalid_signature' };
  }

  return { valid: true };
}

// Usage in Express
app.post('/webhooks/stablecoin-gateway', (req, res) => {
  const result = verifyWebhook(req.body, process.env.WEBHOOK_SECRET);

  if (!result.valid) {
    console.error('Webhook verification failed:', result.error);
    return res.status(400).json({ error: result.error });
  }

  // Process the webhook
  console.log('Valid webhook received:', req.body.event);

  // Return 200 to acknowledge receipt
  res.status(200).json({ received: true });
});
```

## Language-Specific Examples

### Python (Flask)

```python
import hmac
import hashlib
import json
import time

def verify_webhook(payload, webhook_secret):
    # Extract signature
    signature = payload.get('signature')
    timestamp = payload.get('timestamp')

    if not signature or not timestamp:
        return False

    # Verify timestamp (5 minute window)
    now = int(time.time() * 1000)
    age = now - timestamp

    if age < 0 or age > 5 * 60 * 1000:
        return False

    # Create copy without signature
    data_to_verify = {k: v for k, v in payload.items() if k != 'signature'}

    # Generate expected signature
    payload_string = json.dumps(data_to_verify, separators=(',', ':'))
    expected_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        payload_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Compare
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/stablecoin-gateway', methods=['POST'])
def handle_webhook():
    payload = request.json

    if not verify_webhook(payload, os.environ['WEBHOOK_SECRET']):
        return {'error': 'invalid_signature'}, 400

    # Process webhook
    print(f"Valid webhook received: {payload['event']}")

    return {'received': True}, 200
```

### PHP

```php
<?php

function verifyWebhook($payload, $webhookSecret) {
    // Check required fields
    if (!isset($payload['signature']) || !isset($payload['timestamp'])) {
        return false;
    }

    // Verify timestamp
    $now = round(microtime(true) * 1000);
    $age = $now - $payload['timestamp'];

    if ($age < 0 || $age > 5 * 60 * 1000) {
        return false;
    }

    // Extract signature
    $receivedSignature = $payload['signature'];
    unset($payload['signature']);

    // Generate expected signature
    $payloadString = json_encode($payload);
    $expectedSignature = hash_hmac('sha256', $payloadString, $webhookSecret);

    // Compare
    return hash_equals($expectedSignature, $receivedSignature);
}

// Usage
$payload = json_decode(file_get_contents('php://input'), true);

if (!verifyWebhook($payload, $_ENV['WEBHOOK_SECRET'])) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_signature']);
    exit;
}

// Process webhook
error_log("Valid webhook received: " . $payload['event']);

http_response_code(200);
echo json_encode(['received' => true]);
```

### Ruby (Rails)

```ruby
require 'openssl'
require 'json'

def verify_webhook(payload, webhook_secret)
  # Check required fields
  return false unless payload['signature'] && payload['timestamp']

  # Verify timestamp
  now = (Time.now.to_f * 1000).to_i
  age = now - payload['timestamp']

  return false if age < 0 || age > 5 * 60 * 1000

  # Extract signature
  signature = payload['signature']
  data_to_verify = payload.except('signature')

  # Generate expected signature
  payload_string = data_to_verify.to_json
  expected_signature = OpenSSL::HMAC.hexdigest('SHA256', webhook_secret, payload_string)

  # Compare
  ActiveSupport::SecurityUtils.secure_compare(signature, expected_signature)
end

# Usage in controller
class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token

  def stablecoin_gateway
    unless verify_webhook(params.to_unsafe_h, ENV['WEBHOOK_SECRET'])
      render json: { error: 'invalid_signature' }, status: 400
      return
    end

    # Process webhook
    Rails.logger.info "Valid webhook received: #{params[:event]}"

    render json: { received: true }, status: 200
  end
end
```

## Best Practices

### 1. Always Verify Signatures

Never process webhooks without signature verification. This protects against:
- Attackers sending fake webhooks
- Replay attacks
- Man-in-the-middle attacks

### 2. Use Timing-Safe Comparison

Use constant-time comparison functions to prevent timing attacks:
- Node.js: `crypto.timingSafeEqual()`
- Python: `hmac.compare_digest()`
- PHP: `hash_equals()`
- Ruby: `ActiveSupport::SecurityUtils.secure_compare()`

### 3. Store Webhook Secret Securely

- Use environment variables, never hardcode
- Rotate webhook secret periodically
- Use different secrets for development/production

### 4. Implement Idempotency

Webhooks may be delivered multiple times. Use the `payment_session_id` to ensure idempotent processing:

```javascript
async function processWebhook(payload) {
  const { payment_session_id, event } = payload;

  // Check if already processed
  const existing = await db.webhookEvents.findOne({
    payment_session_id,
    event,
  });

  if (existing) {
    console.log('Webhook already processed, skipping');
    return;
  }

  // Process webhook
  await processPayment(payload);

  // Record as processed
  await db.webhookEvents.create({
    payment_session_id,
    event,
    processed_at: new Date(),
  });
}
```

### 5. Return 200 Quickly

Respond with 200 as quickly as possible, then process asynchronously:

```javascript
app.post('/webhooks/stablecoin-gateway', async (req, res) => {
  // Verify signature
  const result = verifyWebhook(req.body, process.env.WEBHOOK_SECRET);

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  // Return 200 immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  processWebhook(req.body).catch(err => {
    console.error('Error processing webhook:', err);
  });
});
```

### 6. Log Verification Failures

Log all verification failures for security monitoring:

```javascript
if (!result.valid) {
  logger.warn('Webhook verification failed', {
    error: result.error,
    ip: req.ip,
    timestamp: payload.timestamp,
  });
  return res.status(400).json({ error: result.error });
}
```

## Webhook Events

The following events will be sent via webhook:

### `payment.pending`
Customer has initiated payment, transaction submitted to blockchain.

### `payment.completed`
Payment confirmed on blockchain (required confirmations met).

### `payment.failed`
Payment failed (insufficient funds, wrong amount, etc.).

### `payment.expired`
Payment session expired without payment.

## Testing Webhooks

### Generate Test Signature

```bash
# Using openssl
echo -n '{"event":"payment.completed","payment_session_id":"ps_123","timestamp":1706450400000}' | \
  openssl dgst -sha256 -hmac "your-webhook-secret" | \
  awk '{print $2}'
```

### Test Webhook Endpoint

```bash
curl -X POST http://localhost:3000/webhooks/stablecoin-gateway \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.completed",
    "payment_session_id": "ps_123",
    "amount": "100.00",
    "currency": "USDC",
    "timestamp": 1706450400000,
    "signature": "a1b2c3d4e5f6..."
  }'
```

## Troubleshooting

### Signature Mismatch

**Cause**: JSON serialization differences
**Solution**: Ensure consistent JSON serialization (no extra spaces, same key order)

### Timestamp Too Old

**Cause**: Server clock skew or network delays
**Solution**:
- Sync server clocks with NTP
- Implement webhook retry mechanism
- Consider increasing tolerance window

### Missing Signature

**Cause**: Old webhook format or testing
**Solution**: Ensure all webhooks include signature and timestamp

## Security Contact

If you discover a security vulnerability in our webhook system, please contact:
- **Email**: security@stablecoin-gateway.com
- **Response Time**: 24 hours

## Additional Resources

- [Webhook Retry Logic](./webhook-retries.md)
- [API Authentication](./api-authentication.md)
- [Security Best Practices](./security.md)
