# Stablecoin Gateway

**Accept stablecoin payments (USDC/USDT) with Stripe-level developer experience at 0.5% transaction fees.**

Stablecoin Gateway is a payment platform that enables merchants to accept cryptocurrency stablecoin payments with the simplicity of Stripe but at a fraction of the cost. We bridge the gap between traditional commerce and blockchain payments by abstracting away crypto complexity while delivering sub-1% transaction fees and instant settlement.

## Features

- **Low Fees**: 0.5% per transaction (vs. 2.9% for credit cards)
- **Instant Settlement**: Blockchain confirmation in under 2 minutes
- **No Custody**: Non-custodial - funds go directly to merchant wallets
- **Developer-Friendly**: Stripe-quality API and JavaScript SDK
- **Real-time Updates**: Server-Sent Events for payment status
- **Webhooks**: Event notifications with automatic retries
- **Multiple Networks**: Ethereum mainnet and Polygon (low fees)
- **Stablecoin Support**: USDC and USDT (pegged to USD)
- **Wallet Compatibility**: MetaMask, WalletConnect (170+ mobile wallets)

## Quick Start

### For Merchants

1. **Create an account** at [gateway.io/signup](https://gateway.io/signup)
2. **Generate a payment link** in the dashboard
3. **Share the link** with your customer
4. **Get paid** - funds arrive in your wallet within 2 minutes

### For Developers

```bash
# Install SDK
npm install @stablecoin-gateway/sdk

# Create payment session
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

See [Integration Guides](./docs/guides/merchant-integration.md) for detailed instructions.

## Tech Stack

### Frontend

- **Framework**: Vite 5 + React 18 + TypeScript 5
- **Styling**: Tailwind CSS 3
- **Wallet Integration**: wagmi v2 + viem (ethers.js alternative)
- **State Management**: React Query + React Context
- **Routing**: React Router 6
- **Forms**: React Hook Form
- **Testing**: Vitest + Playwright

### Backend

- **Framework**: Fastify 4 (TypeScript-first)
- **Database**: PostgreSQL 15 + Prisma ORM
- **Cache/Queue**: Redis 7 + BullMQ
- **Blockchain**: ethers.js v6 (Alchemy/Infura RPC)
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Testing**: Jest + integration tests

### Infrastructure

- **Deployment**: AWS ECS Fargate
- **Database**: RDS PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis (Cluster mode)
- **CDN**: CloudFront
- **Monitoring**: Datadog
- **Email**: SendGrid

See [Architecture Documentation](./docs/architecture.md) for detailed system design.

## Project Structure

```
stablecoin-gateway/
├── apps/
│   ├── api/                     # Backend API (Fastify)
│   │   ├── src/
│   │   │   ├── routes/         # API routes
│   │   │   ├── services/       # Business logic
│   │   │   ├── workers/        # Background jobs
│   │   │   └── plugins/        # Fastify plugins
│   │   ├── prisma/             # Database schema
│   │   └── tests/              # API tests
│   └── web/                     # Frontend app (React + Vite)
│       ├── src/
│       │   ├── pages/          # Page components
│       │   ├── components/     # Reusable components
│       │   ├── lib/            # Utilities
│       │   └── hooks/          # Custom React hooks
│       └── e2e/                # End-to-end tests
├── docs/
│   ├── PRD.md                  # Product requirements
│   ├── architecture.md         # System architecture
│   ├── api-contract.yml        # OpenAPI specification
│   ├── database-schema.md      # Database ERD
│   ├── guides/                 # Integration guides
│   │   ├── merchant-integration.md
│   │   ├── webhook-integration.md
│   │   ├── testing-guide.md
│   │   └── troubleshooting.md
│   └── ADRs/                   # Architecture decisions
└── README.md                   # This file
```

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Alchemy API key (for blockchain access)

### Installation

```bash
# Clone repository (if not already cloned)
git clone https://github.com/connectsw/stablecoin-gateway.git
cd stablecoin-gateway

# Install dependencies
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..
```

### Backend Setup

```bash
cd apps/api

# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed test data (optional)
npm run db:seed

# Start development server
npm run dev
# API running at http://localhost:5001
```

### Frontend Setup

```bash
cd apps/web

# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
# Frontend running at http://localhost:3104
# Note: Backend must be running on port 5001 for frontend to connect
```

### Running Tests

```bash
# Backend tests
cd apps/api
npm test                    # All tests (467 total)
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage

# Frontend tests
cd apps/web
npm test                    # Unit tests (79 total)
npm run test:e2e           # End-to-end tests (requires dev server running)
```

**Test Coverage**:
- Backend: 467 tests (security, payment flows, infrastructure)
  - Phase 1: 119 tests (authentication, payment sessions)
  - Phase 2: 89 tests (webhooks, SSE tokens, password policy)
  - Security Audit Phase 2: 155+ tests (all 10 security fixes verified)
- Frontend: 79 tests (UI components, integration, security controls)
- Total: 546 tests ensuring production quality

## Deployment

### Environment Variables

See [Deployment Guide](./docs/guides/deployment.md) for detailed instructions.

#### Backend (apps/api/.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5001` | API server port |
| `NODE_ENV` | No | `development` | Environment (`development`, `production`, `test`) |
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `REDIS_URL` | No | -- | Redis connection string (rate limiting, queues) |
| `JWT_SECRET` | Yes | -- | JWT signing key (min 64 hex chars). Generate: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | No | `15m` | Access token expiry duration |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `7d` | Refresh token expiry duration |
| `INTERNAL_API_KEY` | Prod | -- | Bearer token for `/internal/metrics`. Generate: `openssl rand -hex 32` |
| `WEBHOOK_ENCRYPTION_KEY` | Prod | -- | AES-256 key for webhook secrets (exactly 64 hex chars). Generate: `openssl rand -hex 32` |
| `REDIS_TLS` | No | `false` | Enable TLS for Redis connections (`true`/`false`) |
| `REDIS_TLS_REJECT_UNAUTHORIZED` | No | `true` | Reject self-signed Redis TLS certs (`false` for staging) |
| `REDIS_PASSWORD` | No | -- | Redis password (if not in REDIS_URL) |
| `ALCHEMY_API_KEY` | No | -- | Alchemy RPC provider key |
| `INFURA_PROJECT_ID` | No | -- | Infura RPC provider key |
| `FRONTEND_URL` | No | `http://localhost:3104` | Allowed CORS origin |

#### Frontend (apps/web/.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://localhost:5001` | Backend API base URL |
| `VITE_WALLETCONNECT_PROJECT_ID` | No | -- | WalletConnect project ID |
| `VITE_USE_MOCK_API` | No | `true` | Toggle mock vs. real API calls |
| `VITE_USE_MOCK` | No | `false` | Enable mock wallet (dev only; blocked in production builds) |

> **Important**: `VITE_USE_MOCK=true` is gated behind `import.meta.env.DEV`. Production builds will throw an error if mock wallet code is accessed, regardless of this setting.

#### Generating Secrets

All secrets must be cryptographically random. Use the following commands:

```bash
# JWT signing key (64 hex characters / 32 bytes)
openssl rand -hex 32

# Webhook encryption key (64 hex characters / 32 bytes for AES-256)
openssl rand -hex 32

# Internal API key (64 hex characters)
openssl rand -hex 32

# Database password
openssl rand -base64 24
```

### Build for Production

```bash
# Backend
cd apps/api
npm run build
npm start

# Frontend
cd apps/web
npm run build
# Static files in dist/
```

### Docker Deployment

```bash
# 1. Copy and configure environment variables
cp .env.example .env

# 2. Generate secure secrets (REQUIRED)
# For JWT_SECRET:
openssl rand -hex 32
# Copy the output to JWT_SECRET in .env

# For POSTGRES_PASSWORD:
openssl rand -base64 24
# Copy the output to POSTGRES_PASSWORD in .env

# For WEBHOOK_ENCRYPTION_KEY:
openssl rand -hex 32
# Copy the output to WEBHOOK_ENCRYPTION_KEY in .env

# For INTERNAL_API_KEY:
openssl rand -hex 32
# Copy the output to INTERNAL_API_KEY in .env

# 3. Edit .env with your values
nano .env

# 4. Start all services
docker-compose up -d

# 5. Verify services are running
docker-compose ps
```

**Required Environment Variables for Docker:**
- `JWT_SECRET` - JWT signing key (generate with `openssl rand -hex 32`)
- `POSTGRES_PASSWORD` - Database password (generate with `openssl rand -base64 24`)

**Required in Production:**
- `INTERNAL_API_KEY` - Protects `/internal/metrics` endpoint (generate with `openssl rand -hex 32`)
- `WEBHOOK_ENCRYPTION_KEY` - AES-256 encryption for webhook secrets (generate with `openssl rand -hex 32`)

**Optional Environment Variables:**
- `ALCHEMY_API_KEY` - For blockchain monitoring
- `INFURA_PROJECT_ID` - Alternative blockchain provider
- `REDIS_TLS` - Set to `true` for encrypted Redis connections (recommended in cloud)
- `REDIS_PASSWORD` - Redis authentication (required when using cloud Redis)

See [Docker Compose Configuration](./docker-compose.yml) for details.

## Documentation

### For Merchants

- [Getting Started](./docs/guides/merchant-integration.md) - Create your first payment link
- [Dashboard Guide](./docs/guides/dashboard-guide.md) - Using the merchant dashboard
- [Troubleshooting](./docs/guides/troubleshooting.md) - Common issues and solutions

### For Developers

- [API Reference](./docs/api-contract.yml) - OpenAPI specification
- [JavaScript SDK](./docs/guides/sdk-guide.md) - SDK documentation
- [Webhook Integration](./docs/guides/webhook-integration.md) - Event notifications
- [Testing Guide](./docs/guides/testing-guide.md) - Testing your integration

### For Contributors

- [Architecture](./docs/architecture.md) - System architecture overview
- [Database Schema](./docs/database-schema.md) - Database design
- [ADRs](./docs/ADRs/) - Architecture decision records
- [Contributing](./CONTRIBUTING.md) - How to contribute

## API Overview

### Authentication

**Password Requirements** (Enhanced Security):
- Minimum 12 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

```bash
# Signup
curl -X POST https://api.gateway.io/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "merchant@example.com", "password": "SecurePass123!@"}'

# Login
curl -X POST https://api.gateway.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "merchant@example.com", "password": "SecurePass123!@"}'

# Response includes access token (15-min expiry) and refresh token (7-day expiry)
```

**Authentication Flow**:
1. Sign up or log in to receive access token and refresh token
2. Include access token in `Authorization: Bearer <token>` header
3. When access token expires (15 minutes), use refresh token to get new access token
4. Logout revokes all refresh tokens for enhanced security

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
    "description": "Order #1234",
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
  "expires_at": "2026-02-03T10:00:00Z",
  "created_at": "2026-01-27T10:00:00Z"
}
```

See [API Reference](./docs/api-contract.yml) for complete documentation.

## Webhooks

Receive real-time notifications when payment events occur:

```bash
# Configure webhook
curl -X POST https://api.gateway.io/v1/webhooks \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks",
    "events": ["payment.completed", "payment.failed"]
  }'
```

**Webhook Payload**:
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

See [Webhook Integration Guide](./docs/guides/webhook-integration.md) for setup instructions.

## Testing

### Test Credentials

**Sandbox Environment**: https://api-sandbox.gateway.io

```
Email: test@example.com
Password: TestPassword123!
API Key: sk_test_abc123...
```

### Test Wallets

Use Polygon Mumbai testnet for testing:

1. Install MetaMask
2. Switch to Polygon Mumbai network
3. Get test USDC from [Mumbai Faucet](https://faucet.polygon.technology/)
4. Test payment flow

See [Testing Guide](./docs/guides/testing-guide.md) for detailed instructions.

## Security

### Authentication & Authorization

- **JWT Authentication**: All protected endpoints require valid Bearer tokens
- **API Key Permissions**: Granular permissions (read, write, refund) enforced on all operations
- **API Keys Hashed**: API keys stored hashed (SHA-256)
- **Password Security**: Bcrypt with cost factor 12, 12+ character minimum with complexity requirements
- **SSE Token Security**: Short-lived tokens (15 minutes) sent via Authorization header (not in query strings)
- **Internal Endpoint Protection**: `/internal/metrics` requires `INTERNAL_API_KEY` Bearer auth in production

### API Security

- **Rate Limiting**: 100 requests/minute per user/API key; 5 requests/minute on auth endpoints per IP+UA fingerprint
- **Health Endpoint Exemption**: `/health` exempt from rate limiting for uptime monitoring
- **Security Headers**: HSTS, CSP, X-Frame-Options via Helmet (OWASP recommended)
- **SSE Authentication**: Tokens sent via Authorization header; query-string tokens rejected with 401
- **PATCH Field Whitelisting**: Only safe fields (customer_address, tx_hash, status) can be updated
- **SSRF Protection**: Async DNS validation on webhook URLs prevents internal network access

### Webhook Security

- **Webhook Secret Hashing**: Secrets stored with bcrypt (never retrievable after creation)
- **Webhook Signatures**: HMAC-SHA256 with timing-safe comparison (prevents timing attacks)
- **Webhook Secret Encryption**: AES-256 encryption with 64-char hex key (`WEBHOOK_ENCRYPTION_KEY`)
- **Timestamp Validation**: Rejects webhooks older than 5 minutes (prevents replay attacks)
- **Automatic Retries**: 3 attempts with exponential backoff
- **HTTPS Only**: All webhook URLs must use HTTPS
- **Row Locking**: Prevents race conditions in webhook delivery

### Data & Infrastructure Security

- **Redis TLS**: Configurable TLS encryption for Redis connections (`REDIS_TLS=true`)
- **Mock Code Isolation**: Mock wallet code gated behind `VITE_USE_MOCK=true && DEV`; production builds throw on access
- **No Hardcoded Secrets**: Docker Compose uses `${VAR:?error}` syntax; CI workflow scans for leaked secrets
- **Environment Validation**: Startup checks enforce 64-hex-char encryption keys; rejects 32-char legacy keys
- **Payment Expiration**: State machine enforces `PENDING -> FAILED` transitions for expired sessions
- **Refund Failsafe**: Production throws if blockchain service unavailable; dev/test mode degrades gracefully

### Blockchain Security

- **On-Chain Verification**: All payments verified against blockchain before completion
- **Transaction Validation**: Amount, token contract, recipient, and confirmation count verified
- **Minimum Confirmations**: 12 blocks (Polygon) for security

### Application Security

- **HTTPS Only**: All API communication encrypted with TLS 1.3
- **CORS Allowlist**: Only configured origins permitted; dynamic checking via callback
- **Content Security Policy**: Helmet CSP directives restrict script/style/image sources
- **No Private Keys**: Non-custodial - users sign transactions via wallet
- **Input Validation**: Comprehensive validation on all inputs via Zod schemas

**Security Score**: 95/100 (OWASP Top 10 compliance, Phase 2 audit complete)

See [Security Documentation](./docs/SECURITY.md) for complete details.

## Performance

- **API Response Time**: < 200ms (p95)
- **Payment Confirmation**: 30-120 seconds (blockchain-dependent)
- **Webhook Delivery**: < 5 seconds after confirmation
- **Uptime SLA**: 99.9%

## Pricing

- **Transaction Fee**: 0.5% per successful payment
- **No Monthly Fee**: Pay only for successful transactions
- **No Setup Fee**: Free to get started
- **No Hidden Fees**: Transparent pricing

### Cost Comparison

| Provider | Fee | $100k Sales | $500k Sales | $1M Sales |
|----------|-----|-------------|-------------|-----------|
| Stripe/PayPal | 2.9% + $0.30 | $3,000 | $15,000 | $30,000 |
| Coinbase Commerce | 1% | $1,000 | $5,000 | $10,000 |
| **Stablecoin Gateway** | **0.5%** | **$500** | **$2,500** | **$5,000** |

**Savings**: Up to **$25,000/year** on $1M in sales

## Support

- **Email**: support@gateway.io
- **Documentation**: https://docs.gateway.io
- **Status Page**: https://status.gateway.io
- **Community**: https://community.gateway.io

## Roadmap

### Phase 1 (Current - MVP)
- ✅ Payment link generation
- ✅ Hosted checkout page
- ✅ USDC/USDT support on Polygon/Ethereum
- ✅ MetaMask + WalletConnect integration
- ✅ Merchant dashboard
- ✅ Webhook notifications
- ✅ API + JavaScript SDK

### Phase 2 (Next 3 Months)
- ⏳ Refund functionality
- ⏳ Analytics dashboard
- ⏳ Subscription billing (recurring payments)
- ⏳ Team roles and permissions
- ⏳ CSV export

### Phase 3 (6-12 Months)
- 📋 Shopify plugin
- 📋 WooCommerce plugin
- 📋 Multi-chain support (Solana, Arbitrum, Optimism)
- 📋 Fiat off-ramp (auto-convert to USD)
- 📋 Invoice generation
- 📋 Tax reporting tools

See [Product Roadmap](./docs/PRD.md) for detailed plans.

## Contributing

We welcome contributions! Please see [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

Proprietary - ConnectSW. All rights reserved.

See [LICENSE](./LICENSE) for details.

## Acknowledgments

- Built with [Fastify](https://www.fastify.io/)
- Frontend powered by [Vite](https://vitejs.dev/) and [React](https://react.dev/)
- Blockchain integration via [ethers.js](https://docs.ethers.org/)
- Wallet connections via [wagmi](https://wagmi.sh/) and [WalletConnect](https://walletconnect.com/)

---

**Created by**: ConnectSW
**Last Updated**: 2026-01-29
**Version**: 1.0.0
