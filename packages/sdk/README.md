# @stablecoin-gateway/sdk

Official TypeScript/JavaScript SDK for the Stablecoin Gateway API. Accept stablecoin payments (USDC, USDT) on Polygon and Ethereum with ease.

## Installation

```bash
npm install @stablecoin-gateway/sdk
# or
yarn add @stablecoin-gateway/sdk
# or
pnpm add @stablecoin-gateway/sdk
```

## Quick Start

```typescript
import { StablecoinGateway } from '@stablecoin-gateway/sdk';

// Initialize the client with your API key
const gateway = new StablecoinGateway('your-api-key');

// Create a payment session
const session = await gateway.createPaymentSession({
  amount: 100,
  currency: 'USD',
  merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  description: 'Payment for order #123',
  success_url: 'https://yoursite.com/success',
  cancel_url: 'https://yoursite.com/cancel',
});

// Redirect customer to checkout
console.log('Checkout URL:', session.checkout_url);
```

## Configuration

```typescript
const gateway = new StablecoinGateway('your-api-key', {
  // Custom base URL (for sandbox/testing)
  baseUrl: 'https://sandbox.stablecoin-gateway.com',

  // Request timeout in milliseconds (default: 30000)
  timeout: 60000,

  // Number of retry attempts (default: 3)
  retries: 5,
});
```

## Payment Sessions

### Create a Payment Session

```typescript
const session = await gateway.createPaymentSession({
  // Required
  amount: 100,
  merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',

  // Optional
  currency: 'EUR', // Will be converted to USD
  description: 'Payment for order #123',
  network: 'polygon', // 'polygon' | 'ethereum'
  token: 'USDC', // 'USDC' | 'USDT'
  success_url: 'https://yoursite.com/success',
  cancel_url: 'https://yoursite.com/cancel',
  webhook_url: 'https://yoursite.com/webhook',
  metadata: {
    orderId: '12345',
    customerId: 'cust_abc',
  },
});
```

### Get a Payment Session

```typescript
const session = await gateway.getPaymentSession('ps_abc123');

console.log('Status:', session.status);
console.log('Amount:', session.amount, session.currency);
```

### List Payment Sessions

```typescript
const { data, pagination } = await gateway.listPaymentSessions({
  status: 'PENDING', // Filter by status
  limit: 10,
  offset: 0,
});

console.log(`Found ${pagination.total} payments`);
console.log(`Showing ${data.length} of ${pagination.total}`);

if (pagination.has_more) {
  // Fetch next page
  const nextPage = await gateway.listPaymentSessions({
    limit: 10,
    offset: 10,
  });
}
```

## Refunds

### Create a Refund

```typescript
// Full refund
const refund = await gateway.createRefund('ps_abc123', {
  reason: 'Customer requested refund',
});

// Partial refund
const partialRefund = await gateway.createRefund('ps_abc123', {
  amount: 50,
  reason: 'Partial refund for damaged item',
});
```

### Get a Refund

```typescript
const refund = await gateway.getRefund('ref_xyz789');
console.log('Status:', refund.status);
```

## Webhooks

### Verify Webhook Signatures

Always verify webhook signatures to ensure the request came from Stablecoin Gateway:

```typescript
import { verifyWebhookSignature, parseWebhookPayload } from '@stablecoin-gateway/sdk';

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = req.body.toString();

  try {
    // Verify signature (throws on failure)
    verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!);

    // Parse the payload
    const event = parseWebhookPayload(payload);

    // Handle the event
    switch (event.type) {
      case 'payment.completed':
        console.log('Payment completed:', event.data.id);
        // Fulfill the order
        break;

      case 'payment.failed':
        console.log('Payment failed:', event.data.id);
        // Handle failure
        break;

      case 'refund.completed':
        console.log('Refund completed:', event.data.id);
        // Update order status
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(400);
  }
});
```

## Error Handling

```typescript
import { ApiError, TimeoutError, ConfigurationError } from '@stablecoin-gateway/sdk';

try {
  const session = await gateway.createPaymentSession({
    amount: 100,
    merchant_address: '0x...',
  });
} catch (error) {
  if (error instanceof ApiError) {
    console.log('API Error:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Error Code:', error.code);

    if (error.isValidationError()) {
      console.log('Validation failed:', error.details);
    } else if (error.isRateLimitError()) {
      console.log('Rate limited, retry later');
    }
  } else if (error instanceof TimeoutError) {
    console.log('Request timed out after', error.timeout, 'ms');
  } else if (error instanceof ConfigurationError) {
    console.log('Configuration error:', error.message);
  }
}
```

## TypeScript Support

This SDK is written in TypeScript and includes full type definitions:

```typescript
import type {
  PaymentSession,
  PaymentStatus,
  CreatePaymentSessionParams,
  Refund,
  WebhookPayload,
} from '@stablecoin-gateway/sdk';
```

## API Reference

### StablecoinGateway

| Method | Description |
|--------|-------------|
| `createPaymentSession(params)` | Create a new payment session |
| `getPaymentSession(id)` | Get a payment session by ID |
| `listPaymentSessions(params?)` | List payment sessions with pagination |
| `createRefund(paymentId, params?)` | Create a refund for a payment |
| `getRefund(id)` | Get a refund by ID |
| `listRefunds(params?)` | List refunds with pagination |

### Webhook Functions

| Function | Description |
|----------|-------------|
| `verifyWebhookSignature(payload, signature, secret)` | Verify a webhook signature |
| `parseWebhookPayload(payload)` | Parse a webhook payload into typed object |

### Error Classes

| Class | Description |
|-------|-------------|
| `ApiError` | API request failed (has `statusCode`, `code`, `details`) |
| `TimeoutError` | Request timed out (has `timeout`) |
| `ConfigurationError` | Invalid configuration |
| `WebhookSignatureError` | Invalid webhook signature |

## Support

- Documentation: https://docs.stablecoin-gateway.com
- Issues: https://github.com/Tamoura/Claude-Code-creates-the-SW-company/issues
- Email: support@stablecoin-gateway.com

## License

MIT
