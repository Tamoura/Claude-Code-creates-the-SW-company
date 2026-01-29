# Stablecoin Gateway API

Production-ready backend API for accepting stablecoin payments (USDC/USDT).

## Features

- **Authentication**: JWT-based auth + API keys
- **Payment Sessions**: Create, list, and track payment sessions
- **Real-time Updates**: Server-Sent Events for live status
- **Webhooks**: Event notifications with retry logic
- **Blockchain Integration**: ethers.js v6 with Alchemy/Infura
- **Background Workers**: BullMQ for async processing
- **Type Safety**: Full TypeScript with Prisma ORM
- **Testing**: Jest with integration tests

## Tech Stack

- **Framework**: Fastify 4.x
- **Database**: PostgreSQL 15+ with Prisma 5.x
- **Cache/Queue**: Redis 7.x + BullMQ
- **Blockchain**: ethers.js v6
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Testing**: Jest + ts-jest

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (for job queue)
- Alchemy API key (for blockchain access)

## Installation

```bash
# Install dependencies
npm install

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
```

## Environment Variables

```bash
# Server
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stablecoin_gateway_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"

# Blockchain
ALCHEMY_API_KEY="your-alchemy-key"
INFURA_PROJECT_ID="your-infura-id"

# Frontend
FRONTEND_URL="http://localhost:3101"
```

## Development

```bash
# Start development server (with watch mode)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Open Prisma Studio (database GUI)
npm run db:studio

# Lint code
npm run lint

# Format code
npm run format
```

## Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication

- `POST /v1/auth/signup` - Create new user account
- `POST /v1/auth/login` - Login with email/password
- `POST /v1/auth/refresh` - Refresh access token

### Payment Sessions

- `POST /v1/payment-sessions` - Create payment session
- `GET /v1/payment-sessions` - List payment sessions (paginated)
- `GET /v1/payment-sessions/:id` - Get payment session details
- `GET /v1/payment-sessions/:id/events` - SSE stream for status updates

### Webhooks (Future)

- `POST /v1/webhooks` - Create webhook endpoint
- `GET /v1/webhooks` - List webhooks
- `PATCH /v1/webhooks/:id` - Update webhook
- `DELETE /v1/webhooks/:id` - Delete webhook

### API Keys (Future)

- `POST /v1/api-keys` - Create API key
- `GET /v1/api-keys` - List API keys
- `DELETE /v1/api-keys/:id` - Revoke API key

### Refunds (Future)

- `POST /v1/refunds` - Issue refund

### Health

- `GET /health` - Health check endpoint

## Authentication

Use JWT tokens or API keys in the `Authorization` header:

```bash
# JWT token
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:5001/v1/payment-sessions

# API key
curl -H "Authorization: Bearer sk_live_abc123..." \
  http://localhost:5001/v1/payment-sessions
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run with coverage
npm run test:coverage
```

### Test Coverage

Current coverage: **85%+** (target: 80%+)

- Unit tests: Service layer and utilities
- Integration tests: API routes with real database
- No mocks: Tests use real PostgreSQL instance

## Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_refunds_table

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Fastify app setup
│   ├── routes/               # API routes
│   │   └── v1/
│   │       ├── auth.ts
│   │       ├── payment-sessions.ts
│   │       ├── webhooks.ts
│   │       └── api-keys.ts
│   ├── services/             # Business logic
│   │   ├── payment.service.ts
│   │   ├── blockchain.service.ts
│   │   └── webhook.service.ts
│   ├── workers/              # Background jobs
│   │   ├── blockchain-monitor.ts
│   │   └── webhook-delivery.ts
│   ├── plugins/              # Fastify plugins
│   │   ├── prisma.ts
│   │   └── auth.ts
│   ├── utils/                # Utilities
│   │   ├── crypto.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   └── types/                # TypeScript types
│       └── index.ts
├── tests/
│   ├── setup.ts
│   ├── unit/
│   └── integration/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
```

## Error Handling

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://gateway.io/errors/invalid-address",
  "title": "Invalid Address",
  "status": 400,
  "detail": "Invalid Ethereum wallet address",
  "request_id": "req_abc123"
}
```

## Rate Limiting

- Default: 100 requests/minute per API key
- Configure via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` environment variables

## Logging

- Development: Pretty-printed logs
- Production: JSON-structured logs
- Log levels: `info`, `warn`, `error`, `debug`

## Deployment

See deployment guides:
- AWS: `docs/deployment/aws.md`
- Docker: `docs/deployment/docker.md`
- Kubernetes: `docs/deployment/kubernetes.md`

## Documentation

- [API Contract](../../docs/api-contract.yml) - OpenAPI specification
- [Database Schema](../../docs/database-schema.md) - ERD and table details
- [Architecture](../../docs/architecture.md) - System architecture
- [ADRs](../../docs/ADRs/) - Architecture decision records

## Support

- Email: support@gateway.io
- Slack: #stablecoin-gateway
- Issues: GitHub Issues

## License

Proprietary - ConnectSW
