# API Documentation

Complete API reference for Stablecoin Gateway with code examples in multiple languages.

## Base URLs

| Environment | URL |
|------------|-----|
| Production | `https://api.gateway.io` |
| Sandbox | `https://api-sandbox.gateway.io` |

## Authentication

All API requests require authentication using an API key in the `Authorization` header:

```http
Authorization: Bearer sk_live_abc123...
```

Get your API key from [Dashboard → API Keys](https://gateway.io/dashboard/api-keys).

### API Key Types

| Prefix | Environment | Usage |
|--------|-------------|-------|
| `sk_live_` | Production | Real payments with real money |
| `sk_test_` | Sandbox | Test payments on Mumbai testnet |

### API Key Permissions

Each API key has granular permissions that are enforced on all operations:

| Permission | Allows | Example Operations |
|------------|--------|-------------------|
| `read` | View payment sessions, transactions | GET /v1/payment-sessions |
| `write` | Create and update payments | POST /v1/payment-sessions, PATCH /v1/payment-sessions/:id |
| `refund` | Issue refunds | POST /v1/refunds |

**Permission Enforcement**:
- Read-only keys (`{read: true, write: false, refund: false}`) can only GET resources
- Write keys require explicit permission to POST or PATCH
- Refund operations require dedicated permission for security

**Example**: Creating a read-only API key
```bash
curl -X POST https://api.gateway.io/v1/api-keys \
  -H "Authorization: Bearer <your-session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analytics Dashboard",
    "permissions": {
      "read": true,
      "write": false,
      "refund": false
    }
  }'
```

**Important**: Never commit API keys to version control. Use environment variables.

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Payment creation | 10 requests/minute |
| Payment queries | 100 requests/minute |
| Webhook config | 5 requests/minute |
| Global | 100 requests/minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706356800
```

When rate limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42

{
  "type": "https://gateway.io/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Too many requests. Limit: 100/minute",
  "retry_after": 42
}
```

---

## Error Handling

All errors follow [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807) format:

```json
{
  "type": "https://gateway.io/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Invalid payment amount",
  "instance": "/v1/payment-sessions",
  "request_id": "req_abc123",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be between 1 and 10000"
    }
  ]
}
```

### Error Types

| Type | Status | Description |
|------|--------|-------------|
| `authentication-error` | 401 | Invalid or missing API key |
| `authorization-error` | 403 | API key doesn't have permission |
| `validation-error` | 400 | Invalid request parameters |
| `not-found` | 404 | Resource not found |
| `rate-limit` | 429 | Too many requests |
| `internal-error` | 500 | Server error (contact support) |

---

## Pagination

List endpoints return paginated results:

**Request**:
```http
GET /v1/payment-sessions?limit=50&starting_after=ps_abc123
```

**Response**:
```json
{
  "data": [...],
  "has_more": true,
  "next_cursor": "ps_xyz789"
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Number of results (max 100) |
| `starting_after` | string | - | Cursor for pagination |

---

## Security

### Password Policy

For your account security, passwords must meet the following requirements:

| Requirement | Rule |
|------------|------|
| Length | Minimum 12 characters |
| Uppercase | At least 1 uppercase letter (A-Z) |
| Lowercase | At least 1 lowercase letter (a-z) |
| Number | At least 1 number (0-9) |
| Special Character | At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?) |

**Examples**:

Valid passwords:
- `MySecure123!`
- `P@ssw0rd2026`
- `Tr0ng#Password!`

Invalid passwords:
- `Short1!` (too short)
- `nocapitals123!` (no uppercase)
- `NOCAPS123!` (no lowercase)
- `NoNumbers!` (no numbers)
- `NoSpecial123` (no special character)

---

## Endpoints

### Authentication

#### POST /v1/auth/signup

Create a new user account.

**Password Requirements**:
- Minimum 12 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Request**:
```http
POST /v1/auth/signup
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "SecurePass123!"
}
```

**Response**: `201 Created`
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "merchant@example.com",
    "created_at": "2026-01-27T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Code Examples**:

<details>
<summary>cURL</summary>

```bash
curl -X POST https://api.gateway.io/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!"
  }'
```
</details>

<details>
<summary>Node.js</summary>

```typescript
const response = await fetch('https://api.gateway.io/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'merchant@example.com',
    password: 'SecurePass123!',
  }),
});

const { user, access_token } = await response.json();
console.log('User created:', user.id);
```
</details>

<details>
<summary>Python</summary>

```python
import requests

response = requests.post(
    'https://api.gateway.io/v1/auth/signup',
    json={
        'email': 'merchant@example.com',
        'password': 'SecurePass123!'
    }
)

data = response.json()
print(f"User created: {data['user']['id']}")
```
</details>

---

#### POST /v1/auth/login

Login with email and password.

**Request**:
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "SecurePass123!"
}
```

**Response**: `200 OK`
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "merchant@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

---

### Payment Sessions

#### POST /v1/payment-sessions

Create a new payment session.

**Request**:
```http
POST /v1/payment-sessions
Authorization: Bearer sk_live_abc123
Content-Type: application/json
Idempotency-Key: unique-key-123

{
  "amount": 100.00,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "description": "Order #1234",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel",
  "metadata": {
    "order_id": "1234",
    "customer_id": "cust_456"
  }
}
```

**Response**: `201 Created`
```json
{
  "id": "ps_abc123",
  "object": "payment_session",
  "status": "pending",
  "amount": 100.00,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "description": "Order #1234",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "checkout_url": "https://gateway.io/checkout/ps_abc123",
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel",
  "metadata": {
    "order_id": "1234",
    "customer_id": "cust_456"
  },
  "expires_at": "2026-02-03T10:00:00Z",
  "created_at": "2026-01-27T10:00:00Z",
  "updated_at": "2026-01-27T10:00:00Z"
}
```

**Code Examples**:

<details>
<summary>cURL</summary>

```bash
curl -X POST https://api.gateway.io/v1/payment-sessions \
  -H "Authorization: Bearer sk_live_abc123" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "description": "Order #1234",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```
</details>

<details>
<summary>Node.js</summary>

```typescript
const response = await fetch('https://api.gateway.io/v1/payment-sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.STABLECOIN_GATEWAY_API_KEY}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `order-${orderId}`,
  },
  body: JSON.stringify({
    amount: 100.00,
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
console.log('Checkout URL:', payment.checkout_url);

// Redirect customer to checkout
window.location.href = payment.checkout_url;
```
</details>

<details>
<summary>Python</summary>

```python
import requests
import os

response = requests.post(
    'https://api.gateway.io/v1/payment-sessions',
    headers={
        'Authorization': f"Bearer {os.environ['STABLECOIN_GATEWAY_API_KEY']}",
        'Content-Type': 'application/json',
        'Idempotency-Key': f'order-{order_id}',
    },
    json={
        'amount': 100.00,
        'currency': 'USD',
        'network': 'polygon',
        'token': 'USDC',
        'description': f'Order #{order_id}',
        'merchant_address': os.environ['MERCHANT_WALLET_ADDRESS'],
        'success_url': f'https://yoursite.com/orders/{order_id}/success',
        'cancel_url': f'https://yoursite.com/orders/{order_id}/cancel',
    }
)

payment = response.json()
print(f"Checkout URL: {payment['checkout_url']}")
```
</details>

<details>
<summary>PHP</summary>

```php
<?php
$apiKey = getenv('STABLECOIN_GATEWAY_API_KEY');
$merchantAddress = getenv('MERCHANT_WALLET_ADDRESS');

$data = [
    'amount' => 100.00,
    'currency' => 'USD',
    'network' => 'polygon',
    'token' => 'USDC',
    'description' => "Order #{$orderId}",
    'merchant_address' => $merchantAddress,
    'success_url' => "https://yoursite.com/orders/{$orderId}/success",
    'cancel_url' => "https://yoursite.com/orders/{$orderId}/cancel",
];

$ch = curl_init('https://api.gateway.io/v1/payment-sessions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {$apiKey}",
    'Content-Type: application/json',
    "Idempotency-Key: order-{$orderId}",
]);

$response = curl_exec($ch);
$payment = json_decode($response, true);

echo "Checkout URL: {$payment['checkout_url']}\n";
?>
```
</details>

---

#### GET /v1/payment-sessions/:id

Retrieve a payment session by ID.

**Request**:
```http
GET /v1/payment-sessions/ps_abc123
Authorization: Bearer sk_live_abc123
```

**Response**: `200 OK`
```json
{
  "id": "ps_abc123",
  "object": "payment_session",
  "status": "completed",
  "amount": 100.00,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "description": "Order #1234",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "customer_address": "0x123...",
  "tx_hash": "0xabc...",
  "block_number": 12345678,
  "confirmations": 64,
  "confirmed_at": "2026-01-27T10:02:15Z",
  "checkout_url": "https://gateway.io/checkout/ps_abc123",
  "expires_at": "2026-02-03T10:00:00Z",
  "created_at": "2026-01-27T10:00:00Z",
  "updated_at": "2026-01-27T10:02:15Z"
}
```

**Code Examples**:

<details>
<summary>Node.js</summary>

```typescript
const response = await fetch(
  `https://api.gateway.io/v1/payment-sessions/${paymentId}`,
  {
    headers: {
      'Authorization': `Bearer ${process.env.STABLECOIN_GATEWAY_API_KEY}`,
    },
  }
);

const payment = await response.json();
console.log('Status:', payment.status);

if (payment.status === 'completed') {
  console.log('Payment successful!');
  console.log('Transaction:', payment.tx_hash);
  // Fulfill order
}
```
</details>

---

#### GET /v1/payment-sessions

List all payment sessions (paginated).

**Request**:
```http
GET /v1/payment-sessions?limit=50&status=completed&starting_after=ps_abc123
Authorization: Bearer sk_live_abc123
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results (max 100, default 50) |
| `starting_after` | string | Cursor for pagination |
| `status` | string | Filter by status: `pending`, `confirming`, `completed`, `failed`, `expired` |
| `created_after` | string | ISO 8601 timestamp |
| `created_before` | string | ISO 8601 timestamp |

**Response**: `200 OK`
```json
{
  "object": "list",
  "data": [
    {
      "id": "ps_abc123",
      "status": "completed",
      "amount": 100.00,
      "created_at": "2026-01-27T10:00:00Z"
    },
    {
      "id": "ps_xyz789",
      "status": "pending",
      "amount": 50.00,
      "created_at": "2026-01-27T09:00:00Z"
    }
  ],
  "has_more": true,
  "next_cursor": "ps_def456"
}
```

---

#### PATCH /v1/payment-sessions/:id

Update a payment session (field whitelisting enforced).

**Security Note**: Only safe fields can be updated. Critical fields (amount, merchant_address) are protected.

**Request**:
```http
PATCH /v1/payment-sessions/ps_abc123
Authorization: Bearer sk_live_abc123
Content-Type: application/json

{
  "customer_address": "0x123...",
  "tx_hash": "0xabc...",
  "status": "confirming"
}
```

**Allowed Fields**:
- `customer_address` - Customer's wallet address
- `tx_hash` - Transaction hash
- `status` - Payment status (pending, confirming, completed, failed, expired)
- `metadata` - Custom metadata (max 16KB)

**Protected Fields** (cannot be updated):
- `amount` - Payment amount (immutable)
- `merchant_address` - Merchant's wallet (immutable)
- `currency` - Currency type (immutable)
- `network` - Blockchain network (immutable)
- `token` - Token type (immutable)

**Response**: `200 OK`
```json
{
  "id": "ps_abc123",
  "status": "confirming",
  "customer_address": "0x123...",
  "tx_hash": "0xabc...",
  "updated_at": "2026-01-27T10:01:30Z"
}
```

**Code Examples**:

<details>
<summary>Node.js</summary>

```typescript
const response = await fetch(
  `https://api.gateway.io/v1/payment-sessions/${paymentId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.STABLECOIN_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_address: customerWalletAddress,
      tx_hash: transactionHash,
      status: 'confirming',
    }),
  }
);

const payment = await response.json();
console.log('Payment updated:', payment.id);
```
</details>

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid field value |
| 403 | AUTHORIZATION_ERROR | Not the payment owner |
| 404 | NOT_FOUND | Payment session not found |
| 422 | IMMUTABLE_FIELD | Attempted to update protected field |

---

#### GET /v1/payment-sessions/:id/events

Server-Sent Events (SSE) stream for real-time payment status updates.

**Authentication**: Query parameter token required (EventSource doesn't support headers).

**Request**:
```http
GET /v1/payment-sessions/ps_abc123/events?token=<jwt_token>
Accept: text/event-stream
```

**Response**: `200 OK`
```
Content-Type: text/event-stream

event: status-update
data: {"status": "confirming", "tx_hash": "0xabc..."}

event: status-update
data: {"status": "completed", "confirmed_at": "2026-01-27T10:02:15Z"}
```

**Code Example (Node.js)**:

```typescript
// Frontend: Use query token for SSE authentication
const token = localStorage.getItem('access_token');
const eventSource = new EventSource(
  `https://api.gateway.io/v1/payment-sessions/${paymentId}/events?token=${token}`
);

eventSource.addEventListener('status-update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Status changed:', data.status);

  if (data.status === 'completed') {
    console.log('Payment completed!');
    eventSource.close();
  }
});

eventSource.addEventListener('error', (error) => {
  console.error('SSE error:', error);
  eventSource.close();
});
```

**Security Note**:
- The query token approach is used because EventSource doesn't support custom headers
- Token is validated on the backend before opening SSE connection
- Only the payment owner can subscribe to updates

---

### Webhooks

Webhooks allow your server to receive real-time notifications when events occur (e.g., payment completed).

**Available Events**:
- `payment.created` - Payment session created
- `payment.confirming` - Transaction submitted to blockchain
- `payment.completed` - Payment confirmed on-chain
- `payment.failed` - Payment failed or timed out
- `payment.refunded` - Refund issued

#### POST /v1/webhooks

Create a webhook endpoint to receive events.

**Request**:
```http
POST /v1/webhooks
Authorization: Bearer sk_live_abc123
Content-Type: application/json

{
  "url": "https://yourserver.com/webhooks/stablecoin-gateway",
  "events": ["payment.completed", "payment.failed", "payment.refunded"],
  "description": "Production webhook",
  "enabled": true
}
```

**Response**: `201 Created`
```json
{
  "id": "wh_abc123",
  "url": "https://yourserver.com/webhooks/stablecoin-gateway",
  "events": ["payment.completed", "payment.failed", "payment.refunded"],
  "description": "Production webhook",
  "enabled": true,
  "secret": "whsec_1234567890abcdef...",
  "created_at": "2026-01-27T10:00:00Z",
  "updated_at": "2026-01-27T10:00:00Z"
}
```

**Important**:
- Save the `secret` - it's **only shown once** and needed to verify signatures
- URLs must use HTTPS (required for security)
- Secrets are auto-generated and hashed before storage

---

#### GET /v1/webhooks

List all webhook endpoints for your account.

**Request**:
```http
GET /v1/webhooks
Authorization: Bearer sk_live_abc123
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "wh_abc123",
      "url": "https://yourserver.com/webhooks/stablecoin-gateway",
      "events": ["payment.completed", "payment.failed"],
      "description": "Production webhook",
      "enabled": true,
      "created_at": "2026-01-27T10:00:00Z",
      "updated_at": "2026-01-27T10:00:00Z"
    },
    {
      "id": "wh_def456",
      "url": "https://staging.yourserver.com/webhooks",
      "events": ["payment.created"],
      "description": "Staging webhook",
      "enabled": false,
      "created_at": "2026-01-26T08:30:00Z",
      "updated_at": "2026-01-27T09:00:00Z"
    }
  ]
}
```

**Note**: Secrets are never returned in list operations (security measure).

---

#### GET /v1/webhooks/:id

Get details of a specific webhook endpoint.

**Request**:
```http
GET /v1/webhooks/wh_abc123
Authorization: Bearer sk_live_abc123
```

**Response**: `200 OK`
```json
{
  "id": "wh_abc123",
  "url": "https://yourserver.com/webhooks/stablecoin-gateway",
  "events": ["payment.completed", "payment.failed", "payment.refunded"],
  "description": "Production webhook",
  "enabled": true,
  "created_at": "2026-01-27T10:00:00Z",
  "updated_at": "2026-01-27T10:00:00Z"
}
```

**Errors**:
- `404 Not Found` - Webhook doesn't exist or you don't own it

---

#### PATCH /v1/webhooks/:id

Update a webhook endpoint.

**Request**:
```http
PATCH /v1/webhooks/wh_abc123
Authorization: Bearer sk_live_abc123
Content-Type: application/json

{
  "events": ["payment.completed", "payment.failed", "payment.refunded", "payment.created"],
  "description": "Updated production webhook",
  "enabled": false
}
```

**Response**: `200 OK`
```json
{
  "id": "wh_abc123",
  "url": "https://yourserver.com/webhooks/stablecoin-gateway",
  "events": ["payment.completed", "payment.failed", "payment.refunded", "payment.created"],
  "description": "Updated production webhook",
  "enabled": false,
  "created_at": "2026-01-27T10:00:00Z",
  "updated_at": "2026-01-27T11:30:00Z"
}
```

**Updatable Fields**:
- `url` - Webhook endpoint URL (must be HTTPS)
- `events` - Array of event types to subscribe to
- `enabled` - Enable/disable webhook deliveries
- `description` - Human-readable description

**Not Updatable**:
- `secret` - Cannot be changed (create new webhook if needed)

---

#### DELETE /v1/webhooks/:id

Delete a webhook endpoint.

**Request**:
```http
DELETE /v1/webhooks/wh_abc123
Authorization: Bearer sk_live_abc123
```

**Response**: `204 No Content`

**Note**: Deleting a webhook also deletes all associated delivery attempts (cascade delete).

---

#### Webhook Security

All webhook payloads include HMAC-SHA256 signatures for verification:

```json
{
  "id": "evt_abc123",
  "type": "payment.completed",
  "data": {
    "id": "ps_abc123",
    "amount": 100.00,
    "status": "completed",
    "tx_hash": "0x1234..."
  },
  "timestamp": 1706356800000,
  "signature": "sha256=a8b7c6d5e4f3..."
}
```

**Verify signatures** to prevent spoofed requests:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const { signature: _, ...dataToVerify } = payload;
  const payloadString = JSON.stringify(dataToVerify);
  const signedPayload = `${payload.timestamp}.${payloadString}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

See [Webhook Integration Guide](./guides/webhook-integration.md) for complete implementation details.

---

### Refunds (Coming Soon)

#### POST /v1/refunds

Issue a refund to customer's wallet.

**Request**:
```http
POST /v1/refunds
Authorization: Bearer sk_live_abc123
Content-Type: application/json

{
  "payment_id": "ps_abc123",
  "amount": 100.00,
  "reason": "customer_request"
}
```

**Response**: `201 Created`
```json
{
  "id": "ref_abc123",
  "object": "refund",
  "payment_id": "ps_abc123",
  "amount": 100.00,
  "reason": "customer_request",
  "status": "pending",
  "created_at": "2026-01-27T10:00:00Z"
}
```

---

## Idempotency

Prevent duplicate payments by including an `Idempotency-Key` header:

```http
POST /v1/payment-sessions
Idempotency-Key: order-1234
```

If you retry with the same key within 24 hours, you'll get the original response:

```json
{
  "id": "ps_abc123",
  "idempotency_key": "order-1234",
  ...
}
```

**Best Practice**: Use your internal order ID as the idempotency key.

---

## Metadata

Store custom data in the `metadata` field (max 500 characters):

```json
{
  "amount": 100,
  "metadata": {
    "order_id": "1234",
    "customer_id": "cust_456",
    "campaign": "summer_sale"
  }
}
```

Metadata is returned in API responses and webhooks.

---

## Versioning

The API version is specified in the base URL:

```
https://api.gateway.io/v1/...
```

Breaking changes will increment the version number (v2, v3, etc.). We'll support old versions for at least 12 months.

---

## SDK Libraries

Official SDKs available:

- **JavaScript/TypeScript**: [@stablecoin-gateway/sdk](https://www.npmjs.com/package/@stablecoin-gateway/sdk)
- **Python**: [stablecoin-gateway](https://pypi.org/project/stablecoin-gateway/)
- **PHP**: [stablecoin-gateway/stablecoin-gateway-php](https://packagist.org/packages/stablecoin-gateway/stablecoin-gateway-php)
- **Ruby**: [stablecoin_gateway](https://rubygems.org/gems/stablecoin_gateway)

See SDK documentation for usage examples.

---

## OpenAPI Specification

Download the complete OpenAPI spec:

- [api-contract.yml](./api-contract.yml) - OpenAPI 3.0 specification
- Interactive docs: https://docs.gateway.io/api

---

## Support

- **Documentation**: https://docs.gateway.io
- **Email**: support@gateway.io
- **Status**: https://status.gateway.io

---

**Last Updated**: 2026-01-27
**API Version**: v1
