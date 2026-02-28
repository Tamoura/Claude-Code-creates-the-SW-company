# Stablecoin Gateway - User Manual

> **Version**: 1.0.0 | **Last Updated**: 2026-02-28 | **Product**: Stablecoin Gateway by ConnectSW

**Stablecoin Gateway** is a payment processing platform that enables merchants to accept USDC and USDT stablecoin payments on Polygon and Ethereum networks. This manual covers installation, merchant workflows, developer integration, administration, the complete API reference, security practices, and troubleshooting.

---

## Table of Contents

- [1. Getting Started](#1-getting-started)
  - [1.1 What Is Stablecoin Gateway](#11-what-is-stablecoin-gateway)
  - [1.2 System Requirements](#12-system-requirements)
  - [1.3 Installation and Setup](#13-installation-and-setup)
  - [1.4 Starting the Application](#14-starting-the-application)
  - [1.5 Quick Start Guide](#15-quick-start-guide)
- [2. Merchant Guide](#2-merchant-guide)
  - [2.1 Setting Up Your Merchant Account](#21-setting-up-your-merchant-account)
  - [2.2 Creating Payment Sessions](#22-creating-payment-sessions)
  - [2.3 Understanding Payment Statuses](#23-understanding-payment-statuses)
  - [2.4 Payment Links](#24-payment-links)
  - [2.5 Checkout Flow Integration](#25-checkout-flow-integration)
  - [2.6 Handling Webhooks](#26-handling-webhooks)
  - [2.7 Processing Refunds](#27-processing-refunds)
  - [2.8 Analytics and Reporting](#28-analytics-and-reporting)
- [3. Developer Guide](#3-developer-guide)
  - [3.1 API Authentication](#31-api-authentication)
  - [3.2 API Reference Overview](#32-api-reference-overview)
  - [3.3 Error Handling](#33-error-handling)
  - [3.4 Rate Limiting](#34-rate-limiting)
  - [3.5 Idempotency Keys](#35-idempotency-keys)
  - [3.6 Webhook Integration](#36-webhook-integration)
  - [3.7 Code Examples for Common Flows](#37-code-examples-for-common-flows)
  - [3.8 SDKs and Libraries](#38-sdks-and-libraries)
  - [3.9 Testing with the Dev Environment](#39-testing-with-the-dev-environment)
- [4. Admin Guide](#4-admin-guide)
  - [4.1 Admin Dashboard Overview](#41-admin-dashboard-overview)
  - [4.2 User Management](#42-user-management)
  - [4.3 System Monitoring](#43-system-monitoring)
  - [4.4 Environment Configuration](#44-environment-configuration)
  - [4.5 Database Management](#45-database-management)
  - [4.6 Security Best Practices](#46-security-best-practices)
  - [4.7 Troubleshooting Common Issues](#47-troubleshooting-common-issues)
- [5. API Reference](#5-api-reference)
  - [5.1 Authentication Endpoints](#51-authentication-endpoints)
  - [5.2 Payment Session Endpoints](#52-payment-session-endpoints)
  - [5.3 Refund Endpoints](#53-refund-endpoints)
  - [5.4 Webhook Endpoints](#54-webhook-endpoints)
  - [5.5 API Key Endpoints](#55-api-key-endpoints)
  - [5.6 Analytics Endpoints](#56-analytics-endpoints)
  - [5.7 Checkout Endpoints](#57-checkout-endpoints)
  - [5.8 Payment Link Endpoints](#58-payment-link-endpoints)
  - [5.9 User Profile Endpoints](#59-user-profile-endpoints)
  - [5.10 Admin Endpoints](#510-admin-endpoints)
  - [5.11 Health Endpoints](#511-health-endpoints)
- [6. Security](#6-security)
- [7. Troubleshooting](#7-troubleshooting)

---

## System Architecture

```mermaid
graph TD
    subgraph "External Users"
        Merchant["Merchant<br/>(Browser / API Client)"]
        Customer["Customer<br/>(Browser)"]
        ExtService["External Service<br/>(Webhook Consumer)"]
    end

    subgraph "Stablecoin Gateway"
        Web["Web Frontend<br/>React 18 + Vite<br/>Port 3104"]
        API["API Server<br/>Fastify 4<br/>Port 5001"]
        DB["PostgreSQL<br/>Database"]
        Cache["Redis<br/>Cache + Sessions"]
    end

    subgraph "Blockchain Networks"
        Polygon["Polygon Network"]
        Ethereum["Ethereum Network"]
    end

    Merchant -->|"HTTPS"| Web
    Merchant -->|"REST API"| API
    Customer -->|"HTTPS"| Web
    API -->|"Prisma ORM"| DB
    API -->|"ioredis"| Cache
    API -->|"ethers.js v6"| Polygon
    API -->|"ethers.js v6"| Ethereum
    API -->|"POST webhook"| ExtService

    style Web fill:#3B82F6,stroke:#1E40AF,color:#fff
    style API fill:#10B981,stroke:#047857,color:#fff
    style DB fill:#8B5CF6,stroke:#6D28D9,color:#fff
    style Cache fill:#F59E0B,stroke:#D97706,color:#fff
    style Polygon fill:#7C3AED,stroke:#5B21B6,color:#fff
    style Ethereum fill:#6366F1,stroke:#4338CA,color:#fff
```

---

## 1. Getting Started

### 1.1 What Is Stablecoin Gateway

Stablecoin Gateway solves a real problem for merchants: accepting cryptocurrency payments without price volatility. Unlike Bitcoin or Ethereum, stablecoins (USDC and USDT) maintain a 1:1 peg with the US dollar. A $100 payment in USDC is always worth $100.

**Why merchants choose Stablecoin Gateway:**

- **No volatility** -- Stablecoins are pegged to USD. The value does not fluctuate.
- **Low fees** -- Polygon network fees are fractions of a cent. Ethereum fees are higher but still competitive with credit card processing.
- **Fast settlement** -- Polygon confirms in seconds. Ethereum confirms in minutes. No 3-day bank holds.
- **Global reach** -- Accept payments from anyone with a crypto wallet, anywhere in the world, with no cross-border fees.
- **No chargebacks** -- Blockchain transactions are final. Once confirmed, a payment cannot be reversed by the customer.

**Supported stablecoins:**

| Stablecoin | Symbol | Issuer | Networks |
|------------|--------|--------|----------|
| USD Coin | USDC | Circle | Polygon, Ethereum |
| Tether | USDT | Tether Ltd | Polygon, Ethereum |

### 1.2 System Requirements

**Server requirements:**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 20.x | 22.x LTS |
| PostgreSQL | 15.x | 16.x |
| Redis | 7.x | 7.2+ |
| RAM | 1 GB | 2 GB |
| Disk | 5 GB | 20 GB |
| OS | Linux, macOS, Windows | Ubuntu 22.04 LTS |

**Network requirements:**

- Outbound HTTPS access to Polygon and Ethereum RPC endpoints
- Inbound HTTPS for API and frontend (ports 5001 and 3104 by default)

**Browser requirements (frontend dashboard):**

- Chrome 90+, Firefox 90+, Safari 15+, Edge 90+

### 1.3 Installation and Setup

#### Step 1: Clone the Repository

```bash
git clone https://github.com/connectsw/stablecoin-gateway.git
cd stablecoin-gateway
```

#### Step 2: Install Dependencies

```bash
# Install all dependencies (API + Web)
npm install

# Install API dependencies
cd apps/api && npm install && cd ../..

# Install Web dependencies
cd apps/web && npm install && cd ../..
```

#### Step 3: Set Up PostgreSQL

Create a database for the application:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE stablecoin_gateway;

# Exit
\q
```

#### Step 4: Configure Environment Variables

Create a `.env` file in the `apps/api/` directory:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your settings:

```env
# Server
PORT=5001
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/stablecoin_gateway

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-characters

# JWT Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Blockchain RPC Endpoints
POLYGON_RPC_URL=https://polygon-rpc.com
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Webhook
WEBHOOK_SECRET=your-webhook-signing-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3104
```

Create a `.env` file in the `apps/web/` directory:

```env
VITE_API_URL=http://localhost:5001
```

#### Step 5: Run Database Migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
cd ../..
```

#### Step 6: Seed Test Data (Optional)

```bash
cd apps/api
npm run db:seed
cd ../..
```

### 1.4 Starting the Application

**Start both the API and frontend:**

```bash
# Terminal 1: Start the API server
cd apps/api
npm run dev
# API running at http://localhost:5001

# Terminal 2: Start the frontend
cd apps/web
npm run dev
# Frontend running at http://localhost:3104
```

**Verify the API is running:**

```bash
curl http://localhost:5001/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "version": "1.0.0"
}
```

### 1.5 Quick Start Guide

This walkthrough takes you from zero to your first payment in under 5 minutes.

#### Step 1: Create a Merchant Account

```bash
curl -X POST http://localhost:5001/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!",
    "name": "My Store"
  }'
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "merchant@example.com",
    "name": "My Store",
    "role": "merchant",
    "createdAt": "2026-02-28T12:00:00.000Z"
  }
}
```

#### Step 2: Create Your First Payment Session

```bash
curl -X POST http://localhost:5001/v1/payment-sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "amount": 50.00,
    "currency": "USDC",
    "network": "polygon",
    "description": "Order #1001",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
  }'
```

Response:

```json
{
  "id": "ps_def456",
  "amount": 50.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "PENDING",
  "description": "Order #1001",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "checkout_url": "http://localhost:3104/checkout/ps_def456",
  "expires_at": "2026-02-28T13:00:00.000Z",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

#### Step 3: Share the Checkout URL

Send `checkout_url` to your customer. They open it in their browser, connect their wallet, and pay.

#### Step 4: Monitor Payment Status

```bash
# Real-time status via Server-Sent Events
curl -N http://localhost:5001/v1/checkout/ps_def456/status \
  -H "Accept: text/event-stream"
```

You receive events as the payment progresses:

```
data: {"status":"PENDING","timestamp":"2026-02-28T12:00:00.000Z"}

data: {"status":"CONFIRMING","timestamp":"2026-02-28T12:01:30.000Z","tx_hash":"0xabc..."}

data: {"status":"COMPLETED","timestamp":"2026-02-28T12:02:15.000Z","tx_hash":"0xabc..."}
```

---

## 2. Merchant Guide

### 2.1 Setting Up Your Merchant Account

#### Registration

Navigate to `http://localhost:3104/register` or use the API:

```bash
curl -X POST http://localhost:5001/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!",
    "name": "Acme Store"
  }'
```

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Profile Setup

After registration, update your profile with business details:

```bash
curl -X PATCH http://localhost:5001/v1/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Acme Store LLC",
    "business_url": "https://acmestore.com"
  }'
```

#### Creating an API Key

For programmatic access, create an API key:

```bash
curl -X POST http://localhost:5001/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Production Server",
    "permissions": ["read", "write"]
  }'
```

Response:

```json
{
  "id": "key_ghi789",
  "name": "Production Server",
  "key": "YOUR_API_KEY_HERE",
  "permissions": ["read", "write"],
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

> **IMPORTANT**: The `key` value is shown only once. Store it securely. If lost, you must rotate the key.

### 2.2 Creating Payment Sessions

A payment session represents a single payment request. The customer pays into the session, and the system tracks the payment through confirmation on the blockchain.

#### Using curl

```bash
curl -X POST http://localhost:5001/v1/payment-sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "amount": 150.00,
    "currency": "USDC",
    "network": "polygon",
    "description": "Premium Plan - Monthly",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
    "metadata": {
      "order_id": "ORD-2026-1001",
      "customer_email": "buyer@example.com"
    }
  }'
```

#### Using JavaScript (Node.js)

```javascript
const response = await fetch('http://localhost:5001/v1/payment-sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    amount: 150.00,
    currency: 'USDC',
    network: 'polygon',
    description: 'Premium Plan - Monthly',
    merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    metadata: {
      order_id: 'ORD-2026-1001',
      customer_email: 'buyer@example.com',
    },
  }),
});

const session = await response.json();
console.log('Checkout URL:', session.checkout_url);
```

#### Using Python

```python
import requests

response = requests.post(
    'http://localhost:5001/v1/payment-sessions',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}',
    },
    json={
        'amount': 150.00,
        'currency': 'USDC',
        'network': 'polygon',
        'description': 'Premium Plan - Monthly',
        'merchant_address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
        'metadata': {
            'order_id': 'ORD-2026-1001',
            'customer_email': 'buyer@example.com',
        },
    }
)

session = response.json()
print(f"Checkout URL: {session['checkout_url']}")
```

#### Payment Session Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | Yes | Payment amount in the stablecoin's base unit (e.g., 50.00 for $50) |
| `currency` | string | Yes | `USDC` or `USDT` |
| `network` | string | Yes | `polygon` or `ethereum` |
| `description` | string | No | Human-readable description shown to the customer |
| `merchant_address` | string | Yes | Your wallet address to receive funds (0x-prefixed) |
| `metadata` | object | No | Arbitrary key-value pairs for your reference |
| `idempotency_key` | string | No | Unique key to prevent duplicate sessions |

### 2.3 Understanding Payment Statuses

Every payment session moves through a defined set of statuses. Understanding these transitions is critical for integration.

```mermaid
stateDiagram-v2
    [*] --> PENDING : Session created
    PENDING --> CONFIRMING : Customer submits transaction
    CONFIRMING --> COMPLETED : Blockchain confirms transaction
    CONFIRMING --> FAILED : Transaction reverted or timed out
    PENDING --> EXPIRED : Session expired (no payment received)
    PENDING --> CANCELLED : Merchant cancelled session
    COMPLETED --> REFUNDED : Full refund processed
    COMPLETED --> PARTIALLY_REFUNDED : Partial refund processed

    PENDING : Awaiting customer payment
    CONFIRMING : Transaction submitted, awaiting blockchain confirmation
    COMPLETED : Payment received and confirmed
    FAILED : Transaction failed on-chain
    EXPIRED : No payment before session timeout
    CANCELLED : Merchant cancelled before payment
    REFUNDED : Full amount returned to customer
    PARTIALLY_REFUNDED : Partial amount returned
```

**Status descriptions:**

| Status | Description | Typical Duration |
|--------|-------------|------------------|
| `PENDING` | Session created, waiting for customer to pay | Until expiry (default 60 min) |
| `CONFIRMING` | Transaction detected on-chain, waiting for block confirmations | Polygon: 5-30 sec, Ethereum: 1-5 min |
| `COMPLETED` | Payment confirmed on-chain and credited | Terminal state |
| `FAILED` | Transaction reverted or could not be confirmed | Terminal state |
| `EXPIRED` | No payment received before the session expired | Terminal state |
| `CANCELLED` | Merchant cancelled the session before any payment | Terminal state |
| `REFUNDED` | Full refund has been processed | Terminal state |
| `PARTIALLY_REFUNDED` | A partial refund has been processed | Can receive further refunds |

### 2.4 Payment Links

Payment links let you collect payments without writing code. Create a link, share it with your customer, and they pay through a hosted checkout page.

#### Creating a Payment Link

```bash
curl -X POST http://localhost:5001/v1/payment-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "amount": 25.00,
    "currency": "USDC",
    "network": "polygon",
    "description": "Donation to Open Source Fund",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
  }'
```

Response:

```json
{
  "id": "pl_xyz789",
  "url": "http://localhost:3104/pay/pl_xyz789",
  "amount": 25.00,
  "currency": "USDC",
  "network": "polygon",
  "description": "Donation to Open Source Fund",
  "active": true,
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

Share the `url` value with your customer via email, messaging, or embed it on your website.

#### Listing Payment Links

```bash
curl http://localhost:5001/v1/payment-links \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Deactivating a Payment Link

```bash
curl -X DELETE http://localhost:5001/v1/payment-links/pl_xyz789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2.5 Checkout Flow Integration

The checkout flow is how your customers actually pay. You have two options: redirect to a hosted checkout page, or embed the checkout in your own site.

#### Option A: Hosted Checkout (Recommended)

Redirect your customer to the `checkout_url` returned when you create a payment session. The hosted page handles wallet connection, QR code display, and real-time status updates.

```html
<!-- Your website -->
<a href="http://localhost:3104/checkout/ps_def456" class="pay-button">
  Pay $50.00 with USDC
</a>
```

#### Option B: Embedded Checkout

Use the checkout API endpoints to build a custom checkout in your own frontend.

**Step 1: Fetch the session details:**

```javascript
const res = await fetch(`http://localhost:5001/v1/checkout/${sessionId}`);
const session = await res.json();
// Display amount, currency, QR code with session.payment_address
```

**Step 2: Customer submits payment via their wallet.**

**Step 3: Listen for status updates via SSE:**

```javascript
const eventSource = new EventSource(
  `http://localhost:5001/v1/checkout/${sessionId}/status`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status:', data.status);

  if (data.status === 'COMPLETED') {
    // Payment confirmed - show success
    eventSource.close();
  } else if (data.status === 'FAILED') {
    // Payment failed - show error
    eventSource.close();
  }
};

eventSource.onerror = () => {
  console.error('SSE connection lost, falling back to polling');
  eventSource.close();
};
```

#### Checkout Flow Diagram

```mermaid
sequenceDiagram
    participant Customer
    participant Frontend as Web Frontend
    participant API as API Server
    participant Blockchain

    Customer->>Frontend: Opens checkout URL
    Frontend->>API: GET /v1/checkout/:sessionId
    API-->>Frontend: Session details (amount, currency, address)
    Frontend-->>Customer: Shows payment details + QR code

    Customer->>Blockchain: Submits stablecoin transfer
    Blockchain-->>API: Transaction detected (mempool/event)
    API->>API: Update status to CONFIRMING

    Frontend->>API: SSE /v1/checkout/:sessionId/status
    API-->>Frontend: event: status=CONFIRMING

    Blockchain-->>API: Transaction confirmed (N blocks)
    API->>API: Update status to COMPLETED
    API-->>Frontend: event: status=COMPLETED
    Frontend-->>Customer: Shows success confirmation
```

### 2.6 Handling Webhooks

Webhooks notify your server when payment events occur. Instead of polling for status changes, register a webhook URL and receive real-time HTTP POST notifications.

#### Setting Up a Webhook

```bash
curl -X POST http://localhost:5001/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "url": "https://yoursite.com/webhooks/stablecoin",
    "events": [
      "payment.completed",
      "payment.failed",
      "refund.completed"
    ]
  }'
```

Response:

```json
{
  "id": "wh_abc123",
  "url": "https://yoursite.com/webhooks/stablecoin",
  "events": ["payment.completed", "payment.failed", "refund.completed"],
  "secret": "whsec_abc123def456",
  "active": true,
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

> **IMPORTANT**: Store the `secret` value. You need it to verify webhook signatures.

#### Webhook Event Types

| Event | Description |
|-------|-------------|
| `payment.created` | A new payment session was created |
| `payment.confirming` | A transaction was detected and is awaiting confirmation |
| `payment.completed` | Payment confirmed on-chain |
| `payment.failed` | Payment transaction failed |
| `payment.refunded` | A full refund was processed |
| `refund.created` | A refund request was created |
| `refund.processing` | Refund transaction is being processed |
| `refund.completed` | Refund confirmed on-chain |
| `refund.failed` | Refund transaction failed |

#### Webhook Payload Format

```json
{
  "id": "evt_abc123",
  "type": "payment.completed",
  "created_at": "2026-02-28T12:02:15.000Z",
  "data": {
    "payment_session_id": "ps_def456",
    "amount": 50.00,
    "currency": "USDC",
    "network": "polygon",
    "status": "COMPLETED",
    "tx_hash": "0xabc123def456...",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
  }
}
```

#### Webhook Delivery Flow

```mermaid
sequenceDiagram
    participant API as Stablecoin Gateway API
    participant Queue as Webhook Queue
    participant Merchant as Merchant Server

    API->>Queue: Enqueue webhook event
    Queue->>Merchant: POST /webhooks/stablecoin (attempt 1)

    alt Success (2xx response)
        Merchant-->>Queue: 200 OK
        Queue->>Queue: Mark delivered
    else Failure (non-2xx or timeout)
        Merchant-->>Queue: 500 / timeout
        Queue->>Queue: Wait 30 seconds
        Queue->>Merchant: POST (attempt 2)
        alt Still failing
            Queue->>Queue: Wait 60 seconds
            Queue->>Merchant: POST (attempt 3)
            Queue->>Queue: Wait 5 minutes
            Queue->>Merchant: POST (attempt 4)
            Note over Queue: Continues with exponential backoff<br/>up to 8 total attempts over 24 hours
        end
    end
```

#### Verifying Webhook Signatures

Every webhook request includes an `X-Webhook-Signature` header. Verify it to confirm the request came from Stablecoin Gateway and was not tampered with.

**Node.js example:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your Express/Fastify handler:
app.post('/webhooks/stablecoin', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature, 'whsec_abc123def456')) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  switch (event.type) {
    case 'payment.completed':
      // Fulfill the order
      break;
    case 'payment.failed':
      // Notify the customer
      break;
    case 'refund.completed':
      // Update order status
      break;
  }

  res.status(200).send('OK');
});
```

**Python example:**

```python
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

# In your Flask handler:
@app.route('/webhooks/stablecoin', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    if not verify_webhook_signature(request.data, signature, 'whsec_abc123def456'):
        return 'Invalid signature', 401

    event = request.json
    if event['type'] == 'payment.completed':
        # Fulfill the order
        pass

    return 'OK', 200
```

### 2.7 Processing Refunds

You can issue full or partial refunds for completed payments.

#### Creating a Full Refund

```bash
curl -X POST http://localhost:5001/v1/refunds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "payment_session_id": "ps_def456",
    "amount": 50.00,
    "reason": "Customer requested cancellation"
  }'
```

Response:

```json
{
  "id": "ref_mno345",
  "payment_session_id": "ps_def456",
  "amount": 50.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "CREATED",
  "reason": "Customer requested cancellation",
  "createdAt": "2026-02-28T14:00:00.000Z"
}
```

#### Creating a Partial Refund

```bash
curl -X POST http://localhost:5001/v1/refunds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "payment_session_id": "ps_def456",
    "amount": 20.00,
    "reason": "Partial return - 1 of 3 items"
  }'
```

#### Processing and Completing a Refund

After creating a refund, it must be processed (the on-chain transaction) and then completed:

```bash
# Move refund to processing state
curl -X POST http://localhost:5001/v1/refunds/ref_mno345/process \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Mark refund as completed (after on-chain confirmation)
curl -X POST http://localhost:5001/v1/refunds/ref_mno345/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Refund Constraints

- You can only refund `COMPLETED` payments.
- The total of all refunds for a payment cannot exceed the original payment amount.
- Refunds are sent to the original sender's address on the same network.

### 2.8 Analytics and Reporting

The analytics endpoints give you visibility into your payment volume, trends, and breakdowns.

#### Overview

```bash
curl http://localhost:5001/v1/analytics/overview \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:

```json
{
  "total_volume": 15230.50,
  "total_transactions": 142,
  "successful_transactions": 135,
  "failed_transactions": 7,
  "average_transaction": 112.82,
  "success_rate": 0.9507,
  "period": "last_30_days"
}
```

#### Volume Over Time

```bash
curl "http://localhost:5001/v1/analytics/volume?period=daily&start=2026-02-01&end=2026-02-28" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:

```json
{
  "period": "daily",
  "data": [
    { "date": "2026-02-01", "volume": 520.00, "count": 5 },
    { "date": "2026-02-02", "volume": 830.50, "count": 8 },
    { "date": "2026-02-03", "volume": 275.00, "count": 3 }
  ]
}
```

#### Breakdown by Currency and Network

```bash
curl http://localhost:5001/v1/analytics/breakdown \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:

```json
{
  "by_currency": [
    { "currency": "USDC", "volume": 12500.00, "count": 110 },
    { "currency": "USDT", "volume": 2730.50, "count": 32 }
  ],
  "by_network": [
    { "network": "polygon", "volume": 13100.00, "count": 125 },
    { "network": "ethereum", "volume": 2130.50, "count": 17 }
  ],
  "by_status": [
    { "status": "COMPLETED", "volume": 15230.50, "count": 135 },
    { "status": "FAILED", "volume": 0, "count": 7 }
  ]
}
```

---

## 3. Developer Guide

### 3.1 API Authentication

Stablecoin Gateway supports two authentication methods.

#### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as Stablecoin Gateway API
    participant DB as Database

    alt JWT Authentication (User Sessions)
        Client->>API: POST /v1/auth/login {email, password}
        API->>DB: Verify credentials
        DB-->>API: User record
        API-->>Client: {access_token (15 min), refresh_token (7 days)}

        Client->>API: GET /v1/payment-sessions<br/>Authorization: Bearer {access_token}
        API->>API: Verify JWT signature + expiry
        API-->>Client: 200 OK {data}

        Note over Client,API: When access_token expires:
        Client->>API: POST /v1/auth/refresh {refresh_token}
        API-->>Client: {new access_token, new refresh_token}
    else API Key Authentication (Machine-to-Machine)
        Client->>API: GET /v1/payment-sessions<br/>Authorization: Bearer YOUR_API_KEY...
        API->>DB: Hash key, lookup in api_keys table
        DB-->>API: API key record + permissions
        API->>API: Check permissions (read/write/refund)
        API-->>Client: 200 OK {data}
    end
```

#### Method 1: JWT Tokens (User Sessions)

Use JWT authentication for interactive sessions (browser dashboards, mobile apps). Access tokens expire after 15 minutes. Refresh tokens last 7 days.

**Login:**

```bash
curl -X POST http://localhost:5001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!"
  }'
```

**Use the access token:**

```bash
curl http://localhost:5001/v1/payment-sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Refresh when expired:**

```bash
curl -X POST http://localhost:5001/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

#### Method 2: API Keys (Machine-to-Machine)

Use API keys for server-to-server integrations. API keys do not expire but can be rotated or deleted.

**Create an API key:**

```bash
curl -X POST http://localhost:5001/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Production Backend",
    "permissions": ["read", "write", "refund"]
  }'
```

**Use the API key:**

```bash
curl http://localhost:5001/v1/payment-sessions \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**API Key Permissions:**

| Permission | Grants Access To |
|------------|------------------|
| `read` | GET endpoints (list, retrieve sessions, analytics) |
| `write` | POST/PATCH endpoints (create sessions, update webhooks) |
| `refund` | Refund endpoints (create, process, complete refunds) |

### 3.2 API Reference Overview

**Base URL:**

```
http://localhost:5001/v1
```

For production:

```
https://api.yourdomain.com/v1
```

**Common Headers:**

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes (for POST/PATCH) |
| `Authorization` | `Bearer <token_or_api_key>` | Yes (except public endpoints) |
| `Idempotency-Key` | Unique string (UUID recommended) | Recommended for POST |
| `Accept` | `application/json` | Optional (default) |

**Response Envelope:**

All successful responses return the resource directly (no wrapper). All error responses use RFC 7807 format (see section 3.3).

### 3.3 Error Handling

All errors follow the [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807) format.

**Error response structure:**

```json
{
  "type": "https://api.stablecoin-gateway.com/errors/validation-error",
  "title": "validation-error",
  "status": 400,
  "detail": "amount must be a positive number",
  "instance": "/v1/payment-sessions"
}
```

**Error fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | URI reference identifying the error type |
| `title` | string | Short, human-readable error code |
| `status` | number | HTTP status code |
| `detail` | string | Human-readable explanation of the specific error |
| `instance` | string | URI reference identifying the specific occurrence |

**Common error codes:**

| HTTP Status | Title | Description |
|-------------|-------|-------------|
| 400 | `validation-error` | Request body failed validation |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `forbidden` | Authenticated but insufficient permissions |
| 404 | `not-found` | Resource does not exist |
| 409 | `conflict` | Resource already exists or state conflict |
| 422 | `unprocessable-entity` | Request understood but cannot be processed |
| 429 | `rate-limited` | Too many requests |
| 500 | `internal-error` | Unexpected server error |

**Handling errors in code:**

```javascript
const response = await fetch('http://localhost:5001/v1/payment-sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${error.status}: ${error.detail}`);

  switch (error.title) {
    case 'validation-error':
      // Fix the request and retry
      break;
    case 'unauthorized':
      // Refresh the token and retry
      break;
    case 'rate-limited':
      // Wait and retry with exponential backoff
      const retryAfter = response.headers.get('Retry-After');
      break;
    default:
      // Log and alert
      break;
  }
}
```

### 3.4 Rate Limiting

The API enforces rate limits to protect against abuse and ensure fair usage.

**Default limits:**

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Payment Sessions | 60 requests | 1 minute |
| Analytics | 30 requests | 1 minute |
| Webhooks | 30 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

**Rate limit headers:**

Every response includes rate limit information:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `Retry-After` | Seconds until the limit resets (only on 429 responses) |

**Handling rate limits:**

```javascript
async function fetchWithRateLimit(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) return response;

    const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
    console.log(`Rate limited. Retrying in ${retryAfter} seconds...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }
  throw new Error('Max retries exceeded due to rate limiting');
}
```

### 3.5 Idempotency Keys

Idempotency keys prevent duplicate operations when a request is retried (e.g., due to network timeout). If you send the same `Idempotency-Key` twice, the second request returns the cached response from the first.

**How to use:**

```bash
curl -X POST http://localhost:5001/v1/payment-sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "amount": 100.00,
    "currency": "USDC",
    "network": "polygon",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
  }'
```

**Rules:**
- Use a UUID v4 for each unique operation.
- If a request times out, retry with the **same** idempotency key.
- If you want to create a different payment, use a **new** idempotency key.
- Idempotency keys expire after 24 hours.
- Applies to all POST endpoints.

### 3.6 Webhook Integration

See [Section 2.6 Handling Webhooks](#26-handling-webhooks) for the merchant-focused guide. This section covers developer-specific details.

#### Webhook Retry Schedule

| Attempt | Delay After Previous |
|---------|---------------------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 1 minute |
| 4 | 5 minutes |
| 5 | 30 minutes |
| 6 | 2 hours |
| 7 | 8 hours |
| 8 | 24 hours |

After 8 failed attempts, the webhook is marked as failed and no further retries occur. You can view failed deliveries in the dashboard or via the API.

#### Testing Webhooks

Send a test event to your webhook endpoint:

```bash
curl -X POST http://localhost:5001/v1/webhooks/wh_abc123/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This sends a synthetic `payment.completed` event to your registered URL.

### 3.7 Code Examples for Common Flows

#### Flow 1: Create Payment Session, Poll Status, Handle Completion

```javascript
// 1. Create a payment session
const session = await fetch('http://localhost:5001/v1/payment-sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({
    amount: 100.00,
    currency: 'USDC',
    network: 'polygon',
    merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    description: 'Order #1234',
  }),
}).then(r => r.json());

console.log('Send customer to:', session.checkout_url);

// 2. Poll for status (alternative to SSE)
async function pollStatus(sessionId) {
  const terminalStatuses = ['COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'];

  while (true) {
    const res = await fetch(
      `http://localhost:5001/v1/payment-sessions/${sessionId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    ).then(r => r.json());

    console.log('Current status:', res.status);

    if (terminalStatuses.includes(res.status)) {
      return res;
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

const result = await pollStatus(session.id);

// 3. Handle the result
if (result.status === 'COMPLETED') {
  console.log('Payment confirmed! TX:', result.tx_hash);
  // Fulfill the order
} else {
  console.log('Payment did not complete:', result.status);
  // Handle failure
}
```

#### Flow 2: Create Refund for Completed Payment

```javascript
// Create refund (requires 'refund' permission on API key)
const refund = await fetch('http://localhost:5001/v1/refunds', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    payment_session_id: 'ps_def456',
    amount: 25.00, // Partial refund
    reason: 'Item returned',
  }),
}).then(r => r.json());

console.log('Refund created:', refund.id, 'Status:', refund.status);

// Process the refund (initiates blockchain transaction)
await fetch(`http://localhost:5001/v1/refunds/${refund.id}/process`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
});

// Complete the refund (after on-chain confirmation)
await fetch(`http://localhost:5001/v1/refunds/${refund.id}/complete`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
});

console.log('Refund completed');
```

#### Flow 3: Manage Webhooks Programmatically

```javascript
// Create a webhook
const webhook = await fetch('http://localhost:5001/v1/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    url: 'https://myapp.com/webhooks/payments',
    events: ['payment.completed', 'payment.failed', 'refund.completed'],
  }),
}).then(r => r.json());

console.log('Webhook secret:', webhook.secret);

// List all webhooks
const webhooks = await fetch('http://localhost:5001/v1/webhooks', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
}).then(r => r.json());

// Update webhook events
await fetch(`http://localhost:5001/v1/webhooks/${webhook.id}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    events: ['payment.completed', 'refund.completed'],
  }),
});

// Test webhook
await fetch(`http://localhost:5001/v1/webhooks/${webhook.id}/test`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
});

// Delete webhook
await fetch(`http://localhost:5001/v1/webhooks/${webhook.id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${apiKey}` },
});
```

#### Flow 4: Rotate API Keys

```javascript
// Create new key before revoking old one (zero-downtime rotation)
const newKey = await fetch('http://localhost:5001/v1/api-keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentApiKey}`,
  },
  body: JSON.stringify({
    name: 'Production Server (rotated)',
    permissions: ['read', 'write', 'refund'],
  }),
}).then(r => r.json());

console.log('New API key:', newKey.key);
// Deploy newKey.key to your servers

// Or use the rotate endpoint to replace an existing key
const rotated = await fetch(`http://localhost:5001/v1/api-keys/${oldKeyId}/rotate`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${currentApiKey}` },
}).then(r => r.json());

console.log('Rotated key:', rotated.key);
// Old key is immediately invalidated
```

### 3.8 SDKs and Libraries

Official SDKs are on the roadmap:

| Language | Status | Expected |
|----------|--------|----------|
| JavaScript / TypeScript | Planned | Q2 2026 |
| Python | Planned | Q2 2026 |
| Go | Planned | Q3 2026 |
| PHP | Under consideration | TBD |
| Ruby | Under consideration | TBD |

In the meantime, use the REST API directly with any HTTP client. The examples in this manual use `curl`, `fetch` (JavaScript), and `requests` (Python).

### 3.9 Testing with the Dev Environment

#### Test Mode

In development (`NODE_ENV=development`), the API runs in test mode:

- Blockchain transactions are simulated (no real tokens transferred).
- Payment confirmations occur instantly or after a configurable delay.
- Webhook deliveries include a `X-Test-Mode: true` header.

#### Test Wallets

Use these wallet addresses in development:

| Address | Purpose |
|---------|---------|
| `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2` | Merchant receiving address |
| `0x1234567890abcdef1234567890abcdef12345678` | Customer sending address |

#### Simulating Payment Flows

In test mode, use the checkout pay endpoint to simulate a customer payment:

```bash
curl -X POST http://localhost:5001/v1/checkout/ps_def456/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sender_address": "0x1234567890abcdef1234567890abcdef12345678",
    "tx_hash": "0xfake123abc456def789"
  }'
```

This advances the payment session from `PENDING` to `CONFIRMING` to `COMPLETED`.

---

## 4. Admin Guide

### 4.1 Admin Dashboard Overview

The admin dashboard provides system-wide visibility into all users, payments, and platform health. Access requires the `admin` role.

**Accessing the dashboard:**

Navigate to `http://localhost:3104/admin` or use the API:

```bash
curl http://localhost:5001/v1/admin/metrics \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

Response:

```json
{
  "users": {
    "total": 42,
    "active_last_30_days": 35,
    "new_last_7_days": 8
  },
  "payments": {
    "total_volume": 152300.50,
    "total_transactions": 1420,
    "success_rate": 0.9507
  },
  "system": {
    "uptime_seconds": 864000,
    "database_connections": 12,
    "redis_connected": true
  }
}
```

### 4.2 User Management

Admin users can view all merchants and their activity through the admin dashboard. User management operations (role changes, account suspension) are performed via the admin panel in the frontend or via direct database operations for sensitive changes.

### 4.3 System Monitoring

#### Health Check

```bash
curl http://localhost:5001/health
```

Returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "version": "1.0.0"
}
```

#### Readiness Check

```bash
curl http://localhost:5001/ready
```

Returns:

```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

Use `/health` for liveness probes (is the process alive?) and `/ready` for readiness probes (can the service handle requests?).

#### Monitoring Checklist

| What to Monitor | How | Alert Threshold |
|-----------------|-----|-----------------|
| API response time | `/health` endpoint latency | > 500ms P95 |
| Error rate | Application logs | > 1% of requests |
| Database connections | `/ready` check | Pool exhaustion |
| Redis connectivity | `/ready` check | Disconnected |
| Payment success rate | `/v1/admin/metrics` | < 90% |
| Webhook delivery rate | Application logs | > 5% failure |
| Disk space | OS-level monitoring | < 20% free |

### 4.4 Environment Configuration

All configuration is via environment variables. There are no config files to manage.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5001` | API server port |
| `HOST` | No | `0.0.0.0` | API server host |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` |
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | Yes | -- | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | -- | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token expiration |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiration |
| `POLYGON_RPC_URL` | Yes | -- | Polygon JSON-RPC endpoint |
| `ETHEREUM_RPC_URL` | Yes | -- | Ethereum JSON-RPC endpoint |
| `WEBHOOK_SECRET` | Yes | -- | Secret for signing webhook payloads |
| `FRONTEND_URL` | No | `http://localhost:3104` | Frontend URL for CORS |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |

### 4.5 Database Management

The application uses Prisma ORM with PostgreSQL.

**Run migrations:**

```bash
cd apps/api
npx prisma migrate deploy   # Production (applies pending migrations)
npx prisma migrate dev       # Development (creates + applies migrations)
```

**Open Prisma Studio (visual database browser):**

```bash
cd apps/api
npx prisma studio
# Opens at http://localhost:5555
```

**Generate Prisma client after schema changes:**

```bash
cd apps/api
npx prisma generate
```

**Backup the database:**

```bash
pg_dump -U postgres stablecoin_gateway > backup_$(date +%Y%m%d).sql
```

**Restore from backup:**

```bash
psql -U postgres stablecoin_gateway < backup_20260228.sql
```

### 4.6 Security Best Practices

1. **Rotate JWT secrets regularly.** Change `JWT_SECRET` and `JWT_REFRESH_SECRET` at least quarterly. All existing tokens are invalidated when secrets change.

2. **Use strong, unique secrets.** Generate secrets with: `openssl rand -hex 32`

3. **Restrict API key permissions.** Grant only the permissions each key needs. A key that only reads analytics should not have `write` or `refund` permissions.

4. **Enable HTTPS in production.** Never run the API over plain HTTP in production. Use a reverse proxy (nginx, Caddy) with TLS.

5. **Monitor failed login attempts.** High failure rates may indicate brute-force attacks.

6. **Keep dependencies updated.** Run `npm audit` weekly and update vulnerable packages.

### 4.7 Troubleshooting Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` on startup | Database not running | Start PostgreSQL: `brew services start postgresql` |
| `P1001: Can't reach database` | Wrong `DATABASE_URL` | Verify connection string in `.env` |
| Redis connection errors | Redis not running | Start Redis: `brew services start redis` |
| JWT token rejected | Expired or wrong secret | Check `JWT_SECRET` matches between issuer and verifier |
| 429 Too Many Requests | Rate limit exceeded | Wait for `Retry-After` seconds, then retry |
| Webhook delivery failures | Target server unreachable | Check target URL is accessible from the API server |
| Payment stuck in CONFIRMING | Blockchain congestion | Wait for block confirmations; check RPC endpoint health |
| Prisma migration errors | Schema drift | Run `npx prisma migrate reset` in development (destroys data) |

---

## 5. API Reference

All endpoints are under the base URL `http://localhost:5001/v1` unless noted otherwise. Authentication is required unless marked as **Public**.

### 5.1 Authentication Endpoints

#### POST /v1/auth/signup

**Public** -- Create a new merchant account.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!",
    "name": "My Store"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Min 8 chars, upper, lower, number, special char |
| `name` | string | Yes | Display name |

**Response:** `201 Created`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "merchant@example.com",
    "name": "My Store",
    "role": "merchant",
    "createdAt": "2026-02-28T12:00:00.000Z"
  }
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 400 | `validation-error` | Invalid email or weak password |
| 409 | `conflict` | Email already registered |

---

#### POST /v1/auth/login

**Public** -- Authenticate and receive tokens.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Registered email |
| `password` | string | Yes | Account password |

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "merchant@example.com",
    "name": "My Store",
    "role": "merchant"
  }
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 401 | `unauthorized` | Invalid email or password |

---

#### POST /v1/auth/logout

**Authenticated** -- Invalidate the current refresh token.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

**Response:** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

---

#### POST /v1/auth/refresh

**Public** -- Exchange a valid refresh token for a new token pair.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...(new)",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...(new)"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 401 | `unauthorized` | Invalid or expired refresh token |

---

#### POST /v1/auth/forgot-password

**Public** -- Request a password reset email.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com"
  }'
```

**Response:** `200 OK`

```json
{
  "message": "If an account with that email exists, a reset link has been sent."
}
```

> Always returns 200 regardless of whether the email exists, to prevent email enumeration.

---

#### POST /v1/auth/reset-password

**Public** -- Reset password using a reset token from email.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_from_email",
    "password": "NewSecurePass456!"
  }'
```

**Response:** `200 OK`

```json
{
  "message": "Password reset successfully"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 400 | `validation-error` | Weak password |
| 401 | `unauthorized` | Invalid or expired reset token |

---

#### POST /v1/auth/change-password

**Authenticated** -- Change password while logged in.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "current_password": "SecurePass123!",
    "new_password": "EvenMoreSecure789!"
  }'
```

**Response:** `200 OK`

```json
{
  "message": "Password changed successfully"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 400 | `validation-error` | New password is weak |
| 401 | `unauthorized` | Current password is incorrect |

---

### 5.2 Payment Session Endpoints

#### POST /v1/payment-sessions

**Authenticated** -- Create a new payment session.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/payment-sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "amount": 100.00,
    "currency": "USDC",
    "network": "polygon",
    "description": "Invoice #INV-2026-001",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
    "metadata": {
      "invoice_id": "INV-2026-001",
      "customer_id": "cust_123"
    }
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount in stablecoin units (e.g., 100.00) |
| `currency` | string | Yes | `USDC` or `USDT` |
| `network` | string | Yes | `polygon` or `ethereum` |
| `description` | string | No | Shown to customer on checkout |
| `merchant_address` | string | Yes | 0x-prefixed Ethereum address |
| `metadata` | object | No | Key-value pairs for your internal use |
| `idempotency_key` | string | No | Alternative to Idempotency-Key header |

**Response:** `201 Created`

```json
{
  "id": "ps_def456",
  "amount": 100.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "PENDING",
  "description": "Invoice #INV-2026-001",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "checkout_url": "http://localhost:3104/checkout/ps_def456",
  "metadata": {
    "invoice_id": "INV-2026-001",
    "customer_id": "cust_123"
  },
  "expires_at": "2026-02-28T13:00:00.000Z",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 400 | `validation-error` | Invalid amount, currency, network, or address |
| 409 | `conflict` | Duplicate idempotency key with different payload |

---

#### GET /v1/payment-sessions

**Authenticated** -- List your payment sessions with pagination and filtering.

**Request:**

```bash
curl "http://localhost:5001/v1/payment-sessions?status=COMPLETED&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | -- | Filter by status |
| `currency` | string | -- | Filter by `USDC` or `USDT` |
| `network` | string | -- | Filter by `polygon` or `ethereum` |
| `limit` | number | 20 | Items per page (max 100) |
| `offset` | number | 0 | Pagination offset |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "ps_def456",
      "amount": 100.00,
      "currency": "USDC",
      "network": "polygon",
      "status": "COMPLETED",
      "description": "Invoice #INV-2026-001",
      "tx_hash": "0xabc123...",
      "createdAt": "2026-02-28T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

#### GET /v1/payment-sessions/:id

**Authenticated** -- Get a specific payment session.

**Request:**

```bash
curl http://localhost:5001/v1/payment-sessions/ps_def456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "ps_def456",
  "amount": 100.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "COMPLETED",
  "description": "Invoice #INV-2026-001",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "checkout_url": "http://localhost:3104/checkout/ps_def456",
  "tx_hash": "0xabc123def456789...",
  "sender_address": "0x1234567890abcdef...",
  "metadata": { "invoice_id": "INV-2026-001" },
  "expires_at": "2026-02-28T13:00:00.000Z",
  "createdAt": "2026-02-28T12:00:00.000Z",
  "updatedAt": "2026-02-28T12:02:15.000Z"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 404 | `not-found` | Session does not exist or belongs to another user |

---

#### PATCH /v1/payment-sessions/:id

**Authenticated** -- Update a payment session (only while in `PENDING` status).

**Request:**

```bash
curl -X PATCH http://localhost:5001/v1/payment-sessions/ps_def456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "description": "Updated description",
    "metadata": { "note": "Customer requested change" }
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | No | Updated description |
| `metadata` | object | No | Updated metadata (merges with existing) |

**Response:** `200 OK` -- Returns updated session object.

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 404 | `not-found` | Session not found |
| 422 | `unprocessable-entity` | Session is not in PENDING status |

---

### 5.3 Refund Endpoints

#### POST /v1/refunds

**Authenticated (requires `refund` permission for API keys)** -- Create a refund.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/refunds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "payment_session_id": "ps_def456",
    "amount": 50.00,
    "reason": "Customer returned item"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_session_id` | string | Yes | ID of the completed payment |
| `amount` | number | Yes | Refund amount (max: remaining unrefunded amount) |
| `reason` | string | No | Reason for the refund |

**Response:** `201 Created`

```json
{
  "id": "ref_mno345",
  "payment_session_id": "ps_def456",
  "amount": 50.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "CREATED",
  "reason": "Customer returned item",
  "createdAt": "2026-02-28T14:00:00.000Z"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 400 | `validation-error` | Invalid amount |
| 404 | `not-found` | Payment session not found |
| 422 | `unprocessable-entity` | Payment not in COMPLETED status or refund exceeds remaining amount |

---

#### GET /v1/refunds

**Authenticated** -- List refunds.

**Request:**

```bash
curl "http://localhost:5001/v1/refunds?payment_session_id=ps_def456" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "ref_mno345",
      "payment_session_id": "ps_def456",
      "amount": 50.00,
      "currency": "USDC",
      "status": "CREATED",
      "reason": "Customer returned item",
      "createdAt": "2026-02-28T14:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

#### GET /v1/refunds/:id

**Authenticated** -- Get a specific refund.

**Request:**

```bash
curl http://localhost:5001/v1/refunds/ref_mno345 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "ref_mno345",
  "payment_session_id": "ps_def456",
  "amount": 50.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "CREATED",
  "reason": "Customer returned item",
  "tx_hash": null,
  "createdAt": "2026-02-28T14:00:00.000Z",
  "updatedAt": "2026-02-28T14:00:00.000Z"
}
```

---

#### POST /v1/refunds/:id/process

**Authenticated** -- Initiate the refund transaction on-chain.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/refunds/ref_mno345/process \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "ref_mno345",
  "status": "PROCESSING",
  "updatedAt": "2026-02-28T14:05:00.000Z"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 422 | `unprocessable-entity` | Refund not in CREATED status |

---

#### POST /v1/refunds/:id/complete

**Authenticated** -- Mark refund as completed after on-chain confirmation.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/refunds/ref_mno345/complete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "ref_mno345",
  "status": "COMPLETED",
  "tx_hash": "0xref123abc456...",
  "updatedAt": "2026-02-28T14:06:00.000Z"
}
```

---

#### POST /v1/refunds/:id/fail

**Authenticated** -- Mark refund as failed.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/refunds/ref_mno345/fail \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "ref_mno345",
  "status": "FAILED",
  "updatedAt": "2026-02-28T14:06:00.000Z"
}
```

---

### 5.4 Webhook Endpoints

#### POST /v1/webhooks

**Authenticated** -- Register a webhook endpoint.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://yoursite.com/webhooks/payments",
    "events": ["payment.completed", "payment.failed"]
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | HTTPS URL to receive webhook POSTs |
| `events` | string[] | Yes | Array of event types to subscribe to |

**Response:** `201 Created`

```json
{
  "id": "wh_abc123",
  "url": "https://yoursite.com/webhooks/payments",
  "events": ["payment.completed", "payment.failed"],
  "secret": "whsec_abc123def456",
  "active": true,
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

---

#### GET /v1/webhooks

**Authenticated** -- List your webhooks.

**Request:**

```bash
curl http://localhost:5001/v1/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "wh_abc123",
      "url": "https://yoursite.com/webhooks/payments",
      "events": ["payment.completed", "payment.failed"],
      "active": true,
      "createdAt": "2026-02-28T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### GET /v1/webhooks/:id

**Authenticated** -- Get webhook details.

**Request:**

```bash
curl http://localhost:5001/v1/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "wh_abc123",
  "url": "https://yoursite.com/webhooks/payments",
  "events": ["payment.completed", "payment.failed"],
  "secret": "whsec_abc123def456",
  "active": true,
  "last_delivery_at": "2026-02-28T13:00:00.000Z",
  "last_delivery_status": "success",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

---

#### PATCH /v1/webhooks/:id

**Authenticated** -- Update a webhook.

**Request:**

```bash
curl -X PATCH http://localhost:5001/v1/webhooks/wh_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://yoursite.com/webhooks/v2/payments",
    "events": ["payment.completed", "payment.failed", "refund.completed"],
    "active": true
  }'
```

**Response:** `200 OK` -- Returns updated webhook object.

---

#### DELETE /v1/webhooks/:id

**Authenticated** -- Delete a webhook.

**Request:**

```bash
curl -X DELETE http://localhost:5001/v1/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

---

#### POST /v1/webhooks/:id/test

**Authenticated** -- Send a test event to the webhook.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/webhooks/wh_abc123/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "delivered": true,
  "status_code": 200,
  "response_time_ms": 145
}
```

---

### 5.5 API Key Endpoints

#### POST /v1/api-keys

**Authenticated (JWT only)** -- Create a new API key.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Production Server",
    "permissions": ["read", "write", "refund"]
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable label |
| `permissions` | string[] | Yes | Array: `read`, `write`, `refund` |

**Response:** `201 Created`

```json
{
  "id": "key_ghi789",
  "name": "Production Server",
  "key": "YOUR_API_KEY_HERE",
  "permissions": ["read", "write", "refund"],
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

> The `key` field is shown only in this response. Store it securely.

---

#### GET /v1/api-keys

**Authenticated** -- List your API keys (keys are masked).

**Request:**

```bash
curl http://localhost:5001/v1/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "key_ghi789",
      "name": "Production Server",
      "key_prefix": "YOUR_KEY_PREFIX",
      "permissions": ["read", "write", "refund"],
      "last_used_at": "2026-02-28T13:45:00.000Z",
      "createdAt": "2026-02-28T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### GET /v1/api-keys/:id

**Authenticated** -- Get API key details (key is masked).

**Request:**

```bash
curl http://localhost:5001/v1/api-keys/key_ghi789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "key_ghi789",
  "name": "Production Server",
  "key_prefix": "YOUR_KEY_PREFIX",
  "permissions": ["read", "write", "refund"],
  "last_used_at": "2026-02-28T13:45:00.000Z",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

---

#### DELETE /v1/api-keys/:id

**Authenticated** -- Revoke an API key immediately.

**Request:**

```bash
curl -X DELETE http://localhost:5001/v1/api-keys/key_ghi789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

> The key stops working immediately. Any requests using this key will receive 401 Unauthorized.

---

#### POST /v1/api-keys/:id/rotate

**Authenticated** -- Rotate an API key. Generates a new key and invalidates the old one.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/api-keys/key_ghi789/rotate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "key_ghi789",
  "name": "Production Server",
  "key": "YOUR_NEW_API_KEY_HERE",
  "permissions": ["read", "write", "refund"],
  "rotated_at": "2026-02-28T15:00:00.000Z"
}
```

> The old key stops working immediately. Store the new key securely.

---

### 5.6 Analytics Endpoints

#### GET /v1/analytics/overview

**Authenticated** -- Get a high-level overview of your payment metrics.

**Request:**

```bash
curl http://localhost:5001/v1/analytics/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "total_volume": 15230.50,
  "total_transactions": 142,
  "successful_transactions": 135,
  "failed_transactions": 7,
  "average_transaction": 112.82,
  "success_rate": 0.9507,
  "period": "last_30_days"
}
```

---

#### GET /v1/analytics/volume

**Authenticated** -- Get payment volume over time.

**Request:**

```bash
curl "http://localhost:5001/v1/analytics/volume?period=daily&start=2026-02-01&end=2026-02-28" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `daily` | `hourly`, `daily`, `weekly`, `monthly` |
| `start` | string | 30 days ago | Start date (ISO 8601) |
| `end` | string | now | End date (ISO 8601) |

**Response:** `200 OK`

```json
{
  "period": "daily",
  "data": [
    { "date": "2026-02-01", "volume": 520.00, "count": 5 },
    { "date": "2026-02-02", "volume": 830.50, "count": 8 }
  ]
}
```

---

#### GET /v1/analytics/breakdown

**Authenticated** -- Get payment breakdown by currency, network, and status.

**Request:**

```bash
curl http://localhost:5001/v1/analytics/breakdown \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "by_currency": [
    { "currency": "USDC", "volume": 12500.00, "count": 110 },
    { "currency": "USDT", "volume": 2730.50, "count": 32 }
  ],
  "by_network": [
    { "network": "polygon", "volume": 13100.00, "count": 125 },
    { "network": "ethereum", "volume": 2130.50, "count": 17 }
  ],
  "by_status": [
    { "status": "COMPLETED", "volume": 15230.50, "count": 135 },
    { "status": "FAILED", "volume": 0, "count": 7 }
  ]
}
```

---

### 5.7 Checkout Endpoints

These endpoints are used by the checkout frontend. They do not require user authentication (the payment session ID acts as an access token for the checkout flow).

#### GET /v1/checkout/:sessionId

**Public** -- Get checkout session details for the payment page.

**Request:**

```bash
curl http://localhost:5001/v1/checkout/ps_def456
```

**Response:** `200 OK`

```json
{
  "id": "ps_def456",
  "amount": 100.00,
  "currency": "USDC",
  "network": "polygon",
  "status": "PENDING",
  "description": "Invoice #INV-2026-001",
  "payment_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "expires_at": "2026-02-28T13:00:00.000Z"
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 404 | `not-found` | Session does not exist |
| 410 | `gone` | Session expired |

---

#### POST /v1/checkout/:sessionId/pay

**Public** -- Submit a payment for a checkout session.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/checkout/ps_def456/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sender_address": "0x1234567890abcdef1234567890abcdef12345678",
    "tx_hash": "0xabc123def456789..."
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sender_address` | string | Yes | Customer's wallet address |
| `tx_hash` | string | Yes | Transaction hash from the blockchain |

**Response:** `200 OK`

```json
{
  "id": "ps_def456",
  "status": "CONFIRMING",
  "tx_hash": "0xabc123def456789..."
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 404 | `not-found` | Session not found |
| 422 | `unprocessable-entity` | Session not in PENDING status |

---

#### GET /v1/checkout/:sessionId/status

**Public** -- Subscribe to real-time payment status updates via Server-Sent Events (SSE).

**Request:**

```bash
curl -N http://localhost:5001/v1/checkout/ps_def456/status \
  -H "Accept: text/event-stream"
```

**Response:** `200 OK` (text/event-stream)

```
data: {"status":"PENDING","timestamp":"2026-02-28T12:00:00.000Z"}

data: {"status":"CONFIRMING","timestamp":"2026-02-28T12:01:30.000Z","tx_hash":"0xabc..."}

data: {"status":"COMPLETED","timestamp":"2026-02-28T12:02:15.000Z","tx_hash":"0xabc...","confirmations":12}
```

The connection remains open until the payment reaches a terminal status (`COMPLETED`, `FAILED`, `EXPIRED`) or the client disconnects.

---

### 5.8 Payment Link Endpoints

#### POST /v1/payment-links

**Authenticated** -- Create a reusable payment link.

**Request:**

```bash
curl -X POST http://localhost:5001/v1/payment-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 25.00,
    "currency": "USDC",
    "network": "polygon",
    "description": "Monthly Subscription",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount |
| `currency` | string | Yes | `USDC` or `USDT` |
| `network` | string | Yes | `polygon` or `ethereum` |
| `description` | string | No | Description shown to payer |
| `merchant_address` | string | Yes | Receiving wallet address |

**Response:** `201 Created`

```json
{
  "id": "pl_xyz789",
  "url": "http://localhost:3104/pay/pl_xyz789",
  "amount": 25.00,
  "currency": "USDC",
  "network": "polygon",
  "description": "Monthly Subscription",
  "active": true,
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

---

#### GET /v1/payment-links

**Authenticated** -- List your payment links.

**Request:**

```bash
curl http://localhost:5001/v1/payment-links \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "pl_xyz789",
      "url": "http://localhost:3104/pay/pl_xyz789",
      "amount": 25.00,
      "currency": "USDC",
      "network": "polygon",
      "description": "Monthly Subscription",
      "active": true,
      "createdAt": "2026-02-28T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### GET /v1/payment-links/:id

**Authenticated** -- Get payment link details.

**Request:**

```bash
curl http://localhost:5001/v1/payment-links/pl_xyz789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "pl_xyz789",
  "url": "http://localhost:3104/pay/pl_xyz789",
  "amount": 25.00,
  "currency": "USDC",
  "network": "polygon",
  "description": "Monthly Subscription",
  "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "active": true,
  "times_used": 12,
  "total_collected": 300.00,
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

---

#### DELETE /v1/payment-links/:id

**Authenticated** -- Deactivate a payment link.

**Request:**

```bash
curl -X DELETE http://localhost:5001/v1/payment-links/pl_xyz789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

---

### 5.9 User Profile Endpoints

#### GET /v1/me

**Authenticated** -- Get your profile.

**Request:**

```bash
curl http://localhost:5001/v1/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "id": "usr_abc123",
  "email": "merchant@example.com",
  "name": "My Store",
  "role": "merchant",
  "business_url": "https://mystore.com",
  "createdAt": "2026-02-28T12:00:00.000Z",
  "updatedAt": "2026-02-28T12:00:00.000Z"
}
```

---

#### PATCH /v1/me

**Authenticated** -- Update your profile.

**Request:**

```bash
curl -X PATCH http://localhost:5001/v1/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Store LLC",
    "business_url": "https://mystore.com"
  }'
```

**Response:** `200 OK` -- Returns updated profile.

---

#### DELETE /v1/me

**Authenticated** -- Delete your account and all associated data.

**Request:**

```bash
curl -X DELETE http://localhost:5001/v1/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

> This action is irreversible. All payment sessions, API keys, webhooks, and analytics data are permanently deleted.

---

#### GET /v1/me/export

**Authenticated** -- Export all your data (GDPR compliance).

**Request:**

```bash
curl http://localhost:5001/v1/me/export \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`

```json
{
  "user": { "id": "usr_abc123", "email": "merchant@example.com", "name": "My Store" },
  "payment_sessions": [ { "id": "ps_def456", "amount": 100.00, "status": "COMPLETED" } ],
  "refunds": [],
  "webhooks": [ { "id": "wh_abc123", "url": "https://yoursite.com/webhooks" } ],
  "api_keys": [ { "id": "key_ghi789", "name": "Production Server" } ],
  "exported_at": "2026-02-28T12:00:00.000Z"
}
```

---

### 5.10 Admin Endpoints

#### GET /v1/admin/metrics

**Authenticated (admin role required)** -- Get platform-wide metrics.

**Request:**

```bash
curl http://localhost:5001/v1/admin/metrics \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:** `200 OK`

```json
{
  "users": {
    "total": 42,
    "active_last_30_days": 35,
    "new_last_7_days": 8
  },
  "payments": {
    "total_volume": 152300.50,
    "total_transactions": 1420,
    "success_rate": 0.9507
  },
  "system": {
    "uptime_seconds": 864000,
    "database_connections": 12,
    "redis_connected": true
  }
}
```

**Errors:**

| Status | Title | When |
|--------|-------|------|
| 403 | `forbidden` | User does not have admin role |

---

### 5.11 Health Endpoints

These endpoints do not require authentication.

#### GET /health

**Public** -- Liveness check. Returns 200 if the process is alive.

**Request:**

```bash
curl http://localhost:5001/health
```

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

#### GET /ready

**Public** -- Readiness check. Returns 200 if all dependencies are connected.

**Request:**

```bash
curl http://localhost:5001/ready
```

**Response:** `200 OK`

```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Response when not ready:** `503 Service Unavailable`

```json
{
  "status": "not_ready",
  "checks": {
    "database": "connected",
    "redis": "disconnected"
  }
}
```

---

## 6. Security

### Authentication Mechanisms

Stablecoin Gateway uses a dual authentication model:

| Mechanism | Use Case | Lifetime | Storage |
|-----------|----------|----------|---------|
| JWT Access Token | User sessions (dashboards, browsers) | 15 minutes | Client memory |
| JWT Refresh Token | Token renewal | 7 days | httpOnly cookie or secure storage |
| API Key | Server-to-server automation | No expiry (manual rotation) | Hashed in database |

**Token security details:**

- Access tokens are signed with HMAC-SHA256 using `JWT_SECRET`.
- Refresh tokens are signed with a separate `JWT_REFRESH_SECRET`.
- Refresh tokens are rotated on each use. The old token is blacklisted.
- API keys are hashed with SHA-256 before storage. The plaintext key is never stored.

### API Key Permissions

| Permission | Endpoints Accessible |
|------------|---------------------|
| `read` | All GET endpoints |
| `write` | All POST and PATCH endpoints (except refunds) |
| `refund` | POST /v1/refunds, POST /v1/refunds/:id/process, POST /v1/refunds/:id/complete, POST /v1/refunds/:id/fail |

**Principle of least privilege:** Grant only the permissions your integration needs. A read-only analytics dashboard should use a key with only `read` permission.

### Webhook Signature Verification

Every webhook delivery includes:

| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | HMAC-SHA256 hex digest of the request body using the webhook secret |
| `X-Webhook-Timestamp` | Unix timestamp of when the event was created |
| `X-Webhook-ID` | Unique ID for this delivery attempt |

**Verification algorithm:**

1. Compute `HMAC-SHA256(webhook_secret, raw_request_body)`.
2. Compare the result (in hex) against the `X-Webhook-Signature` header using timing-safe comparison.
3. Optionally, reject events with `X-Webhook-Timestamp` older than 5 minutes to prevent replay attacks.

### Rate Limiting

Rate limits are enforced per API key or per user account:

- Authentication endpoints: 10 requests/minute (prevents brute force)
- Payment creation: 60 requests/minute
- Read endpoints: 100 requests/minute
- Admin endpoints: 30 requests/minute

Exceeding the limit returns HTTP 429 with `Retry-After` header.

### CORS Configuration

The API sets CORS headers based on the `FRONTEND_URL` environment variable:

- `Access-Control-Allow-Origin`: Value of `FRONTEND_URL`
- `Access-Control-Allow-Methods`: `GET, POST, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, Idempotency-Key`
- `Access-Control-Allow-Credentials`: `true`

In production, set `FRONTEND_URL` to your exact frontend domain. Never use `*` in production.

### Security Best Practices

1. **Always use HTTPS in production.** TLS encrypts all traffic between clients and the API.
2. **Verify webhook signatures.** Never process a webhook payload without signature verification.
3. **Rotate API keys quarterly.** Use the `/v1/api-keys/:id/rotate` endpoint for zero-downtime rotation.
4. **Use idempotency keys.** Prevent duplicate payments from network retries.
5. **Validate wallet addresses.** Use checksum validation (EIP-55) for all Ethereum addresses.
6. **Monitor failed auth attempts.** Alert on sudden spikes in 401 responses.
7. **Keep secrets out of code.** Use environment variables, never hardcode secrets.
8. **Restrict CORS origins.** Allow only your specific frontend domain.

---

## 7. Troubleshooting

### Common Errors and Solutions

#### Authentication Errors

| Error | Cause | Solution |
|-------|-------|---------|
| `401 unauthorized` on login | Wrong email or password | Verify credentials. Use forgot-password if needed. |
| `401 unauthorized` on API call | Expired access token | Refresh the token via POST /v1/auth/refresh. |
| `401 unauthorized` with API key | Key revoked or rotated | Check the key in dashboard. Generate a new one if needed. |
| `403 forbidden` | Insufficient permissions | Check API key permissions. Admin endpoints require admin role. |

#### Payment Errors

| Error | Cause | Solution |
|-------|-------|---------|
| Payment stuck in PENDING | Customer did not submit a transaction | Share the checkout URL again. Check session expiration. |
| Payment stuck in CONFIRMING | Blockchain congestion or low gas | Wait for network confirmation. Check block explorer. |
| Payment marked FAILED | Transaction reverted on-chain | Check the transaction hash on the block explorer. The customer may need to retry. |
| Payment marked EXPIRED | Session expired before customer paid | Create a new payment session. Consider increasing the expiration window. |
| `422 unprocessable-entity` on refund | Payment not in COMPLETED status, or refund exceeds remaining amount | Verify the payment status and the sum of existing refunds. |

#### Webhook Errors

| Error | Cause | Solution |
|-------|-------|---------|
| Webhook not receiving events | Wrong URL or URL not publicly accessible | Verify the URL is correct and reachable from the API server. Use the test endpoint. |
| Signature verification failing | Using wrong secret or modified payload | Use the `secret` from when the webhook was created. Verify you are hashing the raw body, not parsed JSON. |
| Webhook marked failed after retries | Target server consistently returning non-2xx | Check your server logs. Ensure the handler returns 200 within 30 seconds. |

#### Infrastructure Errors

| Error | Cause | Solution |
|-------|-------|---------|
| `ECONNREFUSED` on port 5001 | API server not running | Start the API: `cd apps/api && npm run dev` |
| `P1001: Can't reach database server` | PostgreSQL not running or wrong URL | Start PostgreSQL. Verify `DATABASE_URL` in `.env`. |
| `ECONNREFUSED` on Redis | Redis not running | Start Redis: `redis-server` or `brew services start redis` |
| Prisma migration errors | Schema drift between code and database | In dev: `npx prisma migrate reset`. In prod: `npx prisma migrate deploy`. |
| `429 Too Many Requests` | Rate limit exceeded | Wait for the `Retry-After` duration. Implement exponential backoff. |

### FAQ

**Q: Which network should I choose, Polygon or Ethereum?**

A: Polygon is recommended for most use cases. Transaction fees are fractions of a cent and confirmation times are 2-5 seconds. Ethereum fees are higher ($1-50+ depending on network congestion) and confirmations take 1-5 minutes, but some users prefer Ethereum for its larger ecosystem and perceived security.

**Q: Can I accept both USDC and USDT on the same payment link?**

A: Each payment session or payment link specifies one currency. To accept both, create separate sessions or links and let the customer choose.

**Q: What happens if a customer overpays?**

A: The system detects the exact amount transferred on-chain. If the amount exceeds the session amount, the excess is recorded in the session metadata. You can issue a partial refund for the difference.

**Q: What happens if a customer underpays?**

A: The session remains in `PENDING` or `CONFIRMING` status. The customer needs to send the remaining amount in a separate transaction, or you can cancel the session and create a new one.

**Q: Are there minimum or maximum payment amounts?**

A: The minimum payment amount is $0.01. The maximum is configurable per merchant but defaults to $1,000,000 per session.

**Q: How do I handle payment session expiration?**

A: Sessions expire after 60 minutes by default. When a session expires, its status changes to `EXPIRED` and no further payments can be made to it. Create a new session for the customer.

**Q: Can I customize the checkout page appearance?**

A: The hosted checkout page uses the default Stablecoin Gateway branding. For custom branding, use the embedded checkout approach (Section 2.5, Option B) and build your own UI using the checkout API endpoints.

**Q: How do I test without real cryptocurrency?**

A: Run the application in development mode (`NODE_ENV=development`). All blockchain interactions are simulated. See Section 3.9 for testing details.

### Support

For issues not covered in this manual:

- **Documentation**: Review the full API reference in Section 5
- **GitHub Issues**: Report bugs at the project repository
- **Email**: support@connectsw.com

---

*This manual is maintained by the ConnectSW Technical Writer agent. For corrections or additions, open a pull request against the `products/stablecoin-gateway/docs/USER-MANUAL.md` file.*
