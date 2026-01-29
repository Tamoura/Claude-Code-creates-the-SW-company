# Stablecoin Gateway - Technical Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: Stablecoin Gateway
**Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What is Stablecoin Gateway?](#what-is-stablecoin-gateway)
3. [System Architecture](#system-architecture)
4. [How a Payment Works](#how-a-payment-works)
5. [Technical Components](#technical-components)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Performance Metrics](#performance-metrics)
9. [Scalability Plan](#scalability-plan)

---

## Executive Summary

Stablecoin Gateway is a payment platform that enables merchants to accept cryptocurrency stablecoin payments (USDC/USDT) with the simplicity of Stripe but at 0.5% transaction fees instead of 3%.

**Key Benefits**:
- **10x cheaper fees**: 0.5% vs 3% for credit cards
- **Instant settlement**: 30-120 seconds vs 2-7 days
- **No crypto complexity**: Works like Stripe for merchants
- **Non-custodial**: Funds go directly to merchant wallets

---

## What is Stablecoin Gateway?

### The Problem

Online businesses lose 2-3% of every sale to credit card processing fees:
- $100,000 in sales → **$3,000 lost to fees**
- $1,000,000 in sales → **$30,000 lost to fees**

Plus, it takes 2-7 days to get paid.

### The Solution

Accept payments in **stablecoins** (USDC and USDT - cryptocurrencies that are always worth $1 each):

**Cost Comparison**:
| Provider | Fee | $100k Sales | $1M Sales |
|----------|-----|-------------|-----------|
| Stripe/PayPal | 2.9% + $0.30 | $3,000 | $30,000 |
| Coinbase Commerce | 1% | $1,000 | $10,000 |
| **Stablecoin Gateway** | **0.5%** | **$500** | **$5,000** |

**Savings**: Up to **$25,000/year** on $1M in sales

### How It Works (3 Steps)

1. **Merchant**: Creates payment link in dashboard
2. **Customer**: Clicks link, connects wallet (MetaMask), pays with USDC/USDT
3. **Done**: Money arrives in merchant's wallet in under 2 minutes

---

## System Architecture

### High-Level Architecture

```
Customer (Browser with MetaMask)
    ↓ HTTPS
Frontend (Next.js + React + Web3)
    ↓ REST API
API Server (Fastify + TypeScript)
    ↓
┌───────────┬──────────────┬────────────┐
│ PostgreSQL│ Redis/BullMQ │ Blockchain │
│ Database  │ Job Queue    │ (Polygon)  │
└───────────┴──────────────┴────────────┘
    ↓
External Services (Alchemy, SendGrid, Datadog)
```

### Technology Stack

**Frontend**:
- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS
- wagmi v2 + viem (Web3 libraries)
- WalletConnect (mobile wallet support)

**Backend**:
- Fastify 4 (TypeScript-first API framework)
- Prisma ORM + PostgreSQL 15
- BullMQ (Redis-backed job queue)
- Zod (runtime validation)
- ethers.js v6 (blockchain interaction)

**Infrastructure**:
- AWS ECS Fargate (containers)
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis
- Cloudflare CDN
- Alchemy (blockchain RPC nodes)

---

## How a Payment Works

### Phase 1: Merchant Creates Payment Link (100ms)

1. **Merchant visits dashboard** → Clicks "Create Payment Link"
2. **Frontend sends API request**:
   ```http
   POST /v1/payment-sessions
   {
     "amount": 100,
     "currency": "USD",
     "network": "polygon",
     "token": "USDC",
     "merchant_address": "0x742d35Cc..."
   }
   ```

3. **Backend**:
   - Validates request (Zod schema)
   - Authenticates merchant (JWT)
   - Generates unique ID: `ps_abc123`
   - Stores in PostgreSQL:
     ```sql
     INSERT INTO payment_sessions (
       id, user_id, amount, status, merchant_address
     ) VALUES (
       'ps_abc123', 'usr_123', 100, 'PENDING', '0x742d35...'
     )
     ```

4. **Returns checkout URL**:
   ```json
   {
     "id": "ps_abc123",
     "checkout_url": "https://gateway.io/checkout/ps_abc123",
     "status": "pending"
   }
   ```

### Phase 2: Customer Pays (1-2 minutes)

1. **Customer clicks link** → Opens hosted checkout page
2. **Clicks "Connect Wallet"** → MetaMask prompts connection
3. **Wallet connected** → Shows wallet address `0x123abc...`
4. **Clicks "Pay with USDC"**:
   - Frontend builds blockchain transaction:
     ```javascript
     const tx = await usdcContract.transfer(
       merchantAddress,
       ethers.parseUnits('100', 6) // 100 USDC
     );
     ```
5. **MetaMask prompts approval** → Customer confirms
6. **Transaction broadcast to blockchain**:
   - Goes into mempool (pending)
   - Mined in next block (2 seconds on Polygon)
   - Returns transaction hash: `0xabc123...`

### Phase 3: Blockchain Monitoring (30-120 seconds)

1. **Blockchain Monitor Worker** (BullMQ job):
   - Polls blockchain every **5 seconds** via Alchemy
   - Checks transaction status:
     ```javascript
     const receipt = await provider.getTransactionReceipt(txHash);
     const confirmations = currentBlock - receipt.blockNumber;

     if (confirmations >= 64) { // Polygon threshold
       // Payment confirmed!
     }
     ```

2. **Updates database**:
   ```sql
   UPDATE payment_sessions
   SET status = 'COMPLETED',
       tx_hash = '0xabc123...',
       confirmations = 64,
       completed_at = NOW()
   WHERE id = 'ps_abc123';
   ```

3. **Triggers notifications**:
   - Webhook delivery job
   - Email notification job

### Phase 4: Merchant Notification (5 seconds)

1. **Webhook Worker**:
   - Builds signed payload:
     ```json
     {
       "type": "payment.completed",
       "data": {
         "payment_session_id": "ps_abc123",
         "amount": 100,
         "tx_hash": "0xabc123..."
       }
     }
     ```
   - Signs with HMAC-SHA256
   - POSTs to merchant's webhook URL
   - Retries on failure: 10s, 60s, 600s

2. **Email Worker**:
   - Sends email via SendGrid:
     ```
     Subject: Payment Received: $100
     Body: Order #1234 payment confirmed
     Transaction: 0xabc123...
     ```

---

## Technical Components

### 1. Frontend (Next.js + React)

**Purpose**: Merchant dashboard and customer checkout

**Key Files**:
```
apps/web/
├── app/
│   ├── dashboard/          # Merchant dashboard
│   └── checkout/[id]/      # Hosted checkout page
├── components/
│   ├── checkout/           # Wallet connection, payment UI
│   └── dashboard/          # Payment list, analytics
└── lib/
    ├── wallet.ts           # Web3 wallet integration
    └── api-client.ts       # Typed API client
```

**Features**:
- Server-side rendering (SSR) for landing pages
- Client-side rendering (CSR) for dashboard
- Real-time updates via Server-Sent Events (SSE)
- Wallet connections: MetaMask, WalletConnect

### 2. Backend API (Fastify)

**Purpose**: Business logic, payment orchestration

**Key Files**:
```
apps/api/
├── src/
│   ├── routes/v1/
│   │   ├── auth.ts                # Signup, login
│   │   ├── payment-sessions.ts   # Create/list payments
│   │   └── webhooks.ts            # Webhook management
│   ├── services/
│   │   ├── blockchain.ts          # RPC interaction
│   │   ├── payment.ts             # Payment logic
│   │   └── webhook.ts             # Webhook delivery
│   └── workers/
│       ├── blockchain-monitor.ts  # Poll for confirmations
│       └── webhook-delivery.ts    # Retry failed webhooks
└── prisma/
    └── schema.prisma              # Database schema
```

**API Design**:
- RESTful endpoints (`/v1/payment-sessions`)
- JWT authentication
- Rate limiting: 100 req/min per API key
- Idempotency keys for duplicate prevention

### 3. Database (PostgreSQL + Prisma)

**Schema**:
- `users` - Merchant accounts
- `payment_sessions` - Payment requests
- `api_keys` - API authentication (hashed)
- `webhook_endpoints` - Webhook configurations
- `webhook_deliveries` - Delivery attempts
- `refunds` - Refund records

**Performance**:
- Connection pooling via PgBouncer
- Indexes on `(user_id, status)`, `tx_hash`
- 1M payments = ~1.6 GB storage
- Query time: <50ms (p95)

### 4. Blockchain Integration

**RPC Providers** (with failover):
1. Primary: Alchemy (fast, reliable)
2. Secondary: Infura (backup)
3. Tertiary: QuickNode (high-performance)

**Confirmation Strategy**:
- Polygon: 64 block confirmations (~128 seconds)
- Ethereum: 3 block confirmations (~36 seconds)

**Smart Contracts**:
- USDC on Polygon: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- USDT on Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

**Re-org Handling**:
- Store block hash with each confirmation
- If hash changes → reset confirmation count
- Alert on detection

### 5. Background Workers (BullMQ)

**Job Queues**:
1. **blockchain-monitor** (High priority)
   - Polls blockchain every 5 seconds
   - Concurrency: 50 jobs
   - Rate: 1000 jobs/minute

2. **webhook-delivery** (Medium priority)
   - Delivers webhooks to merchants
   - Concurrency: 20 jobs
   - Retry: 4 attempts (10s, 60s, 600s)

3. **email-sender** (Low priority)
   - Sends emails via SendGrid
   - Concurrency: 10 jobs

---

## Security Architecture

### Authentication & Authorization

**Merchant Authentication**:
- JWT tokens: 15-minute access + 7-day refresh
- Passwords: Bcrypt (cost factor 12)

**API Key Authentication**:
- Prefixed: `sk_live_` or `sk_test_`
- Hashed with SHA-256 before storage
- Rate limited: 100 req/min per key

### Data Protection

**Encryption**:
- In transit: HTTPS only (TLS 1.3)
- At rest: PostgreSQL native encryption
- Private keys: AWS KMS or HSM

**PII Compliance (GDPR)**:
- Email: Encrypted at rest
- Right to deletion: Soft delete records
- Data export: API endpoint for user data

### Attack Prevention

- **SQL Injection**: Prisma ORM (parameterized queries)
- **XSS**: React auto-escaping + CSP headers
- **CSRF**: SameSite cookies + CSRF tokens
- **DDoS**: Cloudflare CDN + rate limiting
- **Replay Attacks**: Webhook timestamps (reject >5min old)

### Rate Limiting

- Payment creation: 10 req/min
- Payment queries: 100 req/min
- Checkout page: 60 req/min per IP

---

## Deployment Architecture

### AWS Infrastructure

```
VPC (10.0.0.0/16)
├── Public Subnets
│   ├── ALB (Load Balancer)
│   └── NAT Gateway
├── Private Subnets
│   ├── ECS Fargate (API + Web)
│   ├── RDS PostgreSQL (Multi-AZ)
│   └── ElastiCache Redis
└── Database Subnets
    └── RDS (no public access)
```

**Services**:
- **ECS Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database (Multi-AZ for HA)
- **ElastiCache Redis**: Cache + job queue
- **S3**: Static assets, backups
- **CloudFront**: CDN
- **Secrets Manager**: API keys, credentials
- **Datadog**: Monitoring, logs, alerts

### CI/CD Pipeline

```
GitHub Push → Run Tests → Build Docker Images →
Deploy to Staging → Smoke Tests →
Deploy to Production (manual approval)
```

**Deployment Frequency**: 2-3 times per week
**Rollback Time**: <5 minutes

### Cost Estimation

| Service | Monthly Cost |
|---------|--------------|
| ECS Fargate (6 tasks) | $80 |
| RDS PostgreSQL (Multi-AZ) | $120 |
| ElastiCache Redis | $30 |
| Alchemy (blockchain nodes) | $200 |
| SendGrid (email) | $15 |
| Datadog (monitoring) | $45 |
| Other (S3, CloudFront, etc.) | $133 |
| **Total** | **$623/month** |

**Break-even**: $124,600/month transaction volume (~40 payments/day at $100 avg)

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | <200ms (p95) | ~150ms |
| Payment Creation | <100ms | ~80ms |
| Blockchain Confirmation | 30-120s | ~90s (Polygon) |
| Webhook Delivery | <5s | ~3s |
| Database Query Time | <50ms (p95) | ~25ms |
| Page Load Time (LCP) | <3s | ~2.1s |

---

## Scalability Plan

### Current (MVP)
- 100 merchants
- 1,000 payments/day
- Single server (4 CPU, 8GB RAM)
- Infrastructure cost: $623/month

### Target (6 months)
- 1,000 merchants
- 100,000 payments/day (~70/minute)
- Kubernetes cluster (3 nodes)
- Infrastructure cost: ~$2,500/month

### Scaling Strategy

**Horizontal Scaling**:
- API servers: Stateless, add more instances
- Workers: Add more BullMQ worker instances
- Database: Read replicas for analytics

**Vertical Scaling**:
- PostgreSQL: Upgrade to 16 CPU, 64GB RAM
- Redis: Redis Cluster for HA

**Caching**:
- API responses: 5-minute TTL
- Blockchain data: 1-hour TTL
- User profiles: 15-minute TTL

**Database Optimization**:
- Indexes on frequently queried fields
- Partition `payment_sessions` by month
- Archive payments >2 years to S3

---

## Disaster Recovery

### Backup Strategy

**Database Backups**:
- Frequency: Daily snapshots (automated by RDS)
- Retention: 30 days
- Location: Multi-region (us-east-1, us-west-2)
- RPO: 24 hours
- RTO: 4 hours

**Failure Scenarios**:

| Scenario | RTO | Response |
|----------|-----|----------|
| API server crash | 1 min | ECS auto-restart |
| Database primary failure | 2 min | Auto-failover to standby |
| Blockchain node outage | 30 sec | Switch to backup provider |
| Redis failure | 5 min | Restart (operate without cache) |
| DDoS attack | 5 min | Cloudflare DDoS protection |

---

## What Makes This Technically Interesting

### 1. Blockchain State Synchronization

**Challenge**: Stay in sync with blockchain without running your own node

**Solution**:
- Poll every 5 seconds (balance speed vs. cost)
- Wait for 64 confirmations on Polygon (99.99% finality)
- Fallback to 3 RPC providers
- Detect re-orgs by storing block hash

### 2. Non-Custodial Architecture

**Benefit**: Never hold customer funds

**Implications**:
- No KYC/AML required
- Lower regulatory risk
- Can't reverse transactions
- Merchants need "hot wallet" for refunds

### 3. Real-Time Updates with Server-Sent Events

**Why SSE over WebSockets?**
- Simpler (HTTP, not custom protocol)
- Works through firewalls
- Auto-reconnects
- Less server overhead

### 4. Webhook Reliability

**Challenge**: Merchant servers go down, network issues

**Solution**:
- Store all deliveries in database
- Retry with exponential backoff
- Merchants can replay from dashboard
- HMAC signatures for verification

---

## API Overview

### Authentication

```bash
# Signup
curl -X POST https://api.gateway.io/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "merchant@example.com", "password": "SecurePass123!"}'

# Login
curl -X POST https://api.gateway.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "merchant@example.com", "password": "SecurePass123!"}'
```

### Create Payment Session

```bash
curl -X POST https://api.gateway.io/v1/payment-sessions \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
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
  "expires_at": "2026-02-03T10:00:00Z"
}
```

### Webhooks

**Payload Format**:
```json
{
  "id": "evt_xyz789",
  "type": "payment.completed",
  "created_at": "2026-01-27T10:02:15Z",
  "data": {
    "payment_session_id": "ps_abc123",
    "amount": 100,
    "currency": "USD",
    "tx_hash": "0x123...",
    "confirmed_at": "2026-01-27T10:02:15Z"
  }
}
```

**Event Types**:
- `payment.created`
- `payment.confirming`
- `payment.completed`
- `payment.failed`
- `payment.refunded`

---

## Glossary

- **Stablecoin**: Cryptocurrency pegged to fiat currency (USDC = $1 USD)
- **USDC**: USD Coin, issued by Circle, 1:1 backed by USD
- **USDT**: Tether, most widely used stablecoin
- **Gas Fee**: Transaction fee paid to blockchain validators
- **Block Confirmation**: Number of blocks after transaction (more = more secure)
- **Webhook**: HTTP callback to merchant's server on event
- **Hot Wallet**: Blockchain wallet connected to internet (for refunds)
- **MetaMask**: Browser extension for Ethereum blockchain
- **WalletConnect**: Protocol for mobile wallet connections
- **ERC-20**: Token standard on Ethereum (USDC/USDT use this)
- **Polygon**: Layer 2 blockchain with lower fees than Ethereum

---

## Support

- **Documentation**: https://docs.gateway.io
- **API Reference**: [api-contract.yml](../../products/stablecoin-gateway/docs/api-contract.yml)
- **Architecture**: [architecture.md](../../products/stablecoin-gateway/docs/architecture.md)
- **PRD**: [PRD.md](../../products/stablecoin-gateway/docs/PRD.md)

---

**End of Technical Manual**
