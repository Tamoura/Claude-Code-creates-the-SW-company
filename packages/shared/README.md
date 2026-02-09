# @connectsw/shared

Shared utilities and Fastify plugins extracted from production ConnectSW products.

## Components

### Plugins (Fastify)

| Plugin | Description | Source |
|--------|-------------|--------|
| `prismaPlugin` | PrismaClient lifecycle with pool sizing and graceful shutdown | stablecoin-gateway |
| `redisPlugin` | Redis connection with TLS, retry, graceful degradation | stablecoin-gateway |

### Utilities

| Utility | Description | Source |
|---------|-------------|--------|
| `logger` | Structured JSON logging with PII redaction | stablecoin-gateway |
| `crypto` | Password hashing, API key HMAC, webhook signatures | stablecoin-gateway |

## Usage

```typescript
// Import from barrel
import { logger, prismaPlugin, hashApiKey } from '@connectsw/shared';

// Or import specific modules
import { logger } from '@connectsw/shared/utils/logger';
import prismaPlugin from '@connectsw/shared/plugins/prisma';
```

### Fastify Plugin Registration

```typescript
import Fastify from 'fastify';
import { prismaPlugin, redisPlugin } from '@connectsw/shared';

const app = Fastify();

// Register in dependency order
await app.register(prismaPlugin);
await app.register(redisPlugin);

// Now app.prisma and app.redis are available
```

### Logger

```typescript
import { logger } from '@connectsw/shared';

logger.info('Request processed', { userId: '123', duration_ms: 45 });
logger.error('Failed to process', new Error('timeout'));

// Sensitive fields are automatically redacted
logger.info('Auth attempt', { password: 'secret123' });
// Output: { password: '[REDACTED]' }
```

### Crypto Utils

```typescript
import { hashPassword, verifyPassword, hashApiKey, generateApiKey } from '@connectsw/shared';

const hashed = await hashPassword('user-password');
const valid = await verifyPassword('user-password', hashed);

const apiKey = generateApiKey('sk_live');
const keyHash = hashApiKey(apiKey);
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes (for Prisma) | - | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | No | 20 | Connection pool size |
| `DATABASE_POOL_TIMEOUT` | No | 10 | Pool timeout (seconds) |
| `REDIS_URL` | No | - | Redis connection URL |
| `REDIS_TLS` | No | false | Enable TLS for Redis |
| `REDIS_PASSWORD` | No | - | Redis password |
| `API_KEY_HMAC_SECRET` | Prod only | - | HMAC secret for API key hashing |
| `LOG_LEVEL` | No | info | Log level (debug/info/warn/error) |
| `NODE_ENV` | No | - | Environment (production = JSON logs) |
