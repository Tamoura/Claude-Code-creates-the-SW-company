# Database Schema - Stablecoin Gateway

**Version**: 1.0
**Last Updated**: 2026-01-27
**Database**: PostgreSQL 15+
**ORM**: Prisma 5+

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     User        │
├─────────────────┤
│ id: String (PK) │
│ email: String   │◄──────┐
│ passwordHash    │       │
│ createdAt       │       │
│ updatedAt       │       │
└─────────────────┘       │
        │                 │
        │ 1:N             │ 1:N
        │                 │
        ▼                 │
┌─────────────────────┐   │
│  PaymentSession     │   │
├─────────────────────┤   │
│ id: String (PK)     │   │
│ userId: String (FK) ├───┘
│ amount: Decimal     │
│ currency: String    │
│ description: String │
│ status: Enum        │
│ network: String     │
│ token: String       │
│ txHash: String      │
│ blockNumber: Int    │
│ confirmations: Int  │
│ customerAddress     │
│ merchantAddress     │
│ metadata: JSON      │
│ createdAt           │
│ expiresAt           │
│ completedAt         │
└──────┬──────────────┘
       │
       │ 1:N
       │
       ▼
┌─────────────────────────┐
│       Refund            │
├─────────────────────────┤
│ id: String (PK)         │
│ paymentSessionId (FK)   │
│ amount: Decimal         │
│ reason: String          │
│ status: Enum            │
│ txHash: String          │
│ blockNumber: Int        │
│ createdAt               │
│ completedAt             │
└─────────────────────────┘


┌──────────────────────┐
│      ApiKey          │
├──────────────────────┤
│ id: String (PK)      │
│ userId: String (FK)  ├───┐
│ name: String         │   │
│ keyHash: String      │   │
│ keyPrefix: String    │   │
│ permissions: JSON    │   │ 1:N
│ lastUsedAt           │   │
│ createdAt            │   │
└──────────────────────┘   │
                           │
                           │
┌───────────────────────┐  │
│  WebhookEndpoint      │  │
├───────────────────────┤  │
│ id: String (PK)       │  │
│ userId: String (FK)   ├──┘
│ url: String           │
│ secret: String        │
│ events: String[]      │
│ enabled: Boolean      │
│ createdAt             │
│ updatedAt             │
└───────┬───────────────┘
        │
        │ 1:N
        │
        ▼
┌─────────────────────────┐
│  WebhookDelivery        │
├─────────────────────────┤
│ id: String (PK)         │
│ endpointId: String (FK) │
│ eventType: String       │
│ payload: JSON           │
│ attempts: Int           │
│ status: Enum            │
│ lastAttemptAt           │
│ nextAttemptAt           │
│ succeededAt             │
│ responseCode: Int       │
│ responseBody: String    │
│ errorMessage: String    │
└─────────────────────────┘
```

---

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== User Management ====================

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  apiKeys          ApiKey[]
  paymentSessions  PaymentSession[]
  webhookEndpoints WebhookEndpoint[]

  @@map("users")
}

// ==================== Payments ====================

model PaymentSession {
  id     String @id @default(cuid()) // Custom: "ps_" + cuid
  userId String @map("user_id")

  // Payment details
  amount      Decimal @db.Decimal(10, 2) // USD amount (e.g., 100.00)
  currency    String  @default("USD")
  description String?

  // Payment state
  status PaymentStatus @default(PENDING)

  // Blockchain details
  network     String  @default("polygon") // "polygon" | "ethereum"
  token       String  @default("USDC") // "USDC" | "USDT"
  txHash      String? @unique @map("tx_hash") // Blockchain transaction hash
  blockNumber Int?    @map("block_number")
  confirmations Int   @default(0)

  // Wallet addresses
  customerAddress String? @map("customer_address") // Payer's wallet address
  merchantAddress String  @map("merchant_address") // Recipient's wallet address

  // URLs for redirects
  successUrl String? @map("success_url")
  cancelUrl  String? @map("cancel_url")

  // Flexible metadata
  metadata Json? // Custom key-value pairs (max 50KB)

  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  expiresAt   DateTime  @map("expires_at") // Default: createdAt + 7 days
  completedAt DateTime? @map("completed_at")

  // Relations
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refunds Refund[]

  // Indexes for fast queries
  @@index([userId, status])
  @@index([status, createdAt])
  @@index([txHash])
  @@map("payment_sessions")
}

enum PaymentStatus {
  PENDING    // Created, awaiting customer payment
  CONFIRMING // Transaction detected on blockchain, waiting for confirmations
  COMPLETED  // Confirmed on blockchain (3+ blocks Ethereum, 64+ blocks Polygon)
  FAILED     // Transaction reverted, insufficient gas, or expired
  REFUNDED   // Refunded to customer
}

// ==================== Refunds ====================

model Refund {
  id               String @id @default(cuid()) // Custom: "ref_" + cuid
  paymentSessionId String @map("payment_session_id")

  // Refund details
  amount Decimal @db.Decimal(10, 2)
  reason String? // Optional reason for refund

  // Refund state
  status RefundStatus @default(PENDING)

  // Blockchain details
  txHash      String? @unique @map("tx_hash") // Refund transaction hash
  blockNumber Int?    @map("block_number")

  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  completedAt DateTime? @map("completed_at")

  // Relations
  paymentSession PaymentSession @relation(fields: [paymentSessionId], references: [id], onDelete: Cascade)

  @@index([paymentSessionId])
  @@index([status, createdAt])
  @@map("refunds")
}

enum RefundStatus {
  PENDING    // Refund initiated, not yet processed
  PROCESSING // Blockchain transaction sent, waiting for confirmation
  COMPLETED  // Refund confirmed on blockchain
  FAILED     // Refund failed (insufficient balance, gas issues)
}

// ==================== API Keys ====================

model ApiKey {
  id     String @id @default(cuid())
  userId String @map("user_id")

  // Key details
  name        String // User-friendly name ("Production API Key")
  keyHash     String @unique @map("key_hash") // SHA-256 hash of actual API key
  keyPrefix   String @map("key_prefix") // First 16 chars for display ("sk_live_abc123...")
  permissions Json   @default("{\"read\":true,\"write\":true,\"refund\":false}") // JSON object

  // Usage tracking
  lastUsedAt DateTime? @map("last_used_at")

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([keyHash])
  @@map("api_keys")
}

// ==================== Webhooks ====================

model WebhookEndpoint {
  id     String @id @default(cuid())
  userId String @map("user_id")

  // Webhook details
  url         String // HTTPS endpoint (e.g., "https://example.com/webhooks")
  secret      String // Used to sign webhook payloads (HMAC-SHA256)
  events      String[] // Array of event types (e.g., ["payment.completed", "payment.refunded"])
  enabled     Boolean  @default(true)
  description String?

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries WebhookDelivery[]

  @@index([userId])
  @@map("webhook_endpoints")
}

model WebhookDelivery {
  id         String @id @default(cuid())
  endpointId String @map("endpoint_id")

  // Event details
  eventType String @map("event_type") // "payment.completed", "payment.refunded", etc.
  payload   Json   // Full event payload

  // Delivery state
  attempts Int            @default(0)
  status   WebhookStatus  @default(PENDING)

  // Retry timing
  lastAttemptAt DateTime? @map("last_attempt_at")
  nextAttemptAt DateTime? @map("next_attempt_at")
  succeededAt   DateTime? @map("succeeded_at")

  // Response tracking
  responseCode Int?    @map("response_code") // HTTP status code (e.g., 200, 500)
  responseBody String? @map("response_body") @db.Text // Truncated response (max 1000 chars)
  errorMessage String? @map("error_message") @db.Text

  // Relations
  endpoint WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, status])
  @@index([status, nextAttemptAt]) // For retry worker
  @@map("webhook_deliveries")
}

enum WebhookStatus {
  PENDING    // Queued for delivery
  DELIVERING // Currently attempting delivery
  SUCCEEDED  // Successfully delivered (2xx response)
  FAILED     // Failed after all retry attempts
}
```

---

## Table Details

### `users`

**Purpose**: Merchant accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK | User ID (cuid) |
| email | String | UNIQUE, NOT NULL | User email (for login) |
| password_hash | String | NOT NULL | Bcrypt hash (cost factor 12) |
| created_at | Timestamp | NOT NULL, DEFAULT NOW | Account creation time |
| updated_at | Timestamp | NOT NULL, AUTO UPDATE | Last update time |

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`

**Storage Estimate** (100 users):
- Row size: ~150 bytes
- Total: ~15 KB (negligible)

---

### `payment_sessions`

**Purpose**: Payment requests and their status

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK | Payment session ID (ps_xxx) |
| user_id | String | FK → users.id | Merchant who created payment |
| amount | Decimal(10,2) | NOT NULL | Payment amount in USD (e.g., 100.00) |
| currency | String | NOT NULL, DEFAULT 'USD' | Currency code (only USD supported) |
| description | String | NULLABLE | Order description |
| status | Enum | NOT NULL, DEFAULT 'PENDING' | PENDING, CONFIRMING, COMPLETED, FAILED, REFUNDED |
| network | String | NOT NULL, DEFAULT 'polygon' | Blockchain network (polygon, ethereum) |
| token | String | NOT NULL, DEFAULT 'USDC' | Stablecoin token (USDC, USDT) |
| tx_hash | String | UNIQUE, NULLABLE | Blockchain transaction hash |
| block_number | Integer | NULLABLE | Block number where tx was mined |
| confirmations | Integer | NOT NULL, DEFAULT 0 | Number of block confirmations |
| customer_address | String | NULLABLE | Payer's wallet address (0x...) |
| merchant_address | String | NOT NULL | Recipient's wallet address (0x...) |
| success_url | String | NULLABLE | Redirect URL on success |
| cancel_url | String | NULLABLE | Redirect URL on cancellation |
| metadata | JSONB | NULLABLE | Custom key-value pairs (max 50KB) |
| created_at | Timestamp | NOT NULL, DEFAULT NOW | Payment creation time |
| expires_at | Timestamp | NOT NULL | Payment expiration time (default: +7 days) |
| completed_at | Timestamp | NULLABLE | Time when payment was confirmed |

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `(user_id, status)` - For dashboard queries ("show my completed payments")
- INDEX on `(status, created_at)` - For global queries ("recent pending payments")
- UNIQUE INDEX on `tx_hash` - Prevent duplicate transaction processing

**Storage Estimate** (1M payments):
- Row size: ~400 bytes (without metadata)
- Total: ~400 MB
- With metadata (avg 1KB): ~1.4 GB
- Indexes: ~200 MB
- **Total**: ~1.6 GB

**Retention Policy**:
- Active payments: Indefinite
- Completed/Failed payments: Archive after 2 years to S3

---

### `refunds`

**Purpose**: Refund records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK | Refund ID (ref_xxx) |
| payment_session_id | String | FK → payment_sessions.id | Original payment being refunded |
| amount | Decimal(10,2) | NOT NULL | Refund amount (must be ≤ original amount) |
| reason | String | NULLABLE | Reason for refund (optional) |
| status | Enum | NOT NULL, DEFAULT 'PENDING' | PENDING, PROCESSING, COMPLETED, FAILED |
| tx_hash | String | UNIQUE, NULLABLE | Refund transaction hash |
| block_number | Integer | NULLABLE | Block number where refund was mined |
| created_at | Timestamp | NOT NULL, DEFAULT NOW | Refund initiation time |
| completed_at | Timestamp | NULLABLE | Time when refund was confirmed |

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `payment_session_id` - For finding refunds of a payment
- INDEX on `(status, created_at)` - For refund queue processing

**Storage Estimate** (10% refund rate on 1M payments = 100k refunds):
- Row size: ~200 bytes
- Total: ~20 MB (negligible)

---

### `api_keys`

**Purpose**: API authentication keys

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK | API key ID |
| user_id | String | FK → users.id | Merchant who owns this key |
| name | String | NOT NULL | User-friendly name ("Production Key") |
| key_hash | String | UNIQUE, NOT NULL | SHA-256 hash of actual API key |
| key_prefix | String | NOT NULL | First 16 chars for display (sk_live_abc123...) |
| permissions | JSON | NOT NULL | JSON object { read, write, refund } |
| last_used_at | Timestamp | NULLABLE | Last time this key was used |
| created_at | Timestamp | NOT NULL, DEFAULT NOW | Key creation time |

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `key_hash` - For authentication lookups
- INDEX on `user_id` - For listing user's keys

**Storage Estimate** (100 users × 3 keys = 300 keys):
- Row size: ~150 bytes
- Total: ~45 KB (negligible)

**Security**:
- Actual API keys are NEVER stored (only SHA-256 hash)
- Keys are shown only once on creation
- Keys are prefixed with environment: `sk_live_` or `sk_test_`

---

### `webhook_endpoints`

**Purpose**: Webhook configurations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK | Webhook endpoint ID |
| user_id | String | FK → users.id | Merchant who configured this webhook |
| url | String | NOT NULL | HTTPS endpoint URL |
| secret | String | NOT NULL | Secret for signing payloads (HMAC-SHA256) |
| events | String[] | NOT NULL | Array of event types to receive |
| enabled | Boolean | NOT NULL, DEFAULT TRUE | Whether webhook is active |
| description | String | NULLABLE | User-friendly description |
| created_at | Timestamp | NOT NULL, DEFAULT NOW | Webhook creation time |
| updated_at | Timestamp | NOT NULL, AUTO UPDATE | Last update time |

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `user_id` - For listing user's webhooks

**Storage Estimate** (100 users × 2 webhooks = 200 webhooks):
- Row size: ~200 bytes
- Total: ~40 KB (negligible)

---

### `webhook_deliveries`

**Purpose**: Webhook delivery attempts and results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK | Delivery ID |
| endpoint_id | String | FK → webhook_endpoints.id | Webhook being delivered to |
| event_type | String | NOT NULL | Event type (payment.completed, etc.) |
| payload | JSON | NOT NULL | Full event payload |
| attempts | Integer | NOT NULL, DEFAULT 0 | Number of delivery attempts |
| status | Enum | NOT NULL, DEFAULT 'PENDING' | PENDING, DELIVERING, SUCCEEDED, FAILED |
| last_attempt_at | Timestamp | NULLABLE | Time of last delivery attempt |
| next_attempt_at | Timestamp | NULLABLE | Time of next retry (for exponential backoff) |
| succeeded_at | Timestamp | NULLABLE | Time when delivery succeeded |
| response_code | Integer | NULLABLE | HTTP response status code |
| response_body | Text | NULLABLE | Response body (truncated to 1000 chars) |
| error_message | Text | NULLABLE | Error message if delivery failed |

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `(endpoint_id, status)` - For listing deliveries per webhook
- INDEX on `(status, next_attempt_at)` - For retry worker to find pending deliveries

**Storage Estimate** (1M payments × 1 webhook = 1M deliveries):
- Row size: ~500 bytes (with payload)
- Total: ~500 MB

**Retention Policy**:
- Succeeded deliveries: Keep for 7 days, then archive to S3
- Failed deliveries: Keep for 90 days (for debugging)

---

## Migration Strategy

### Initial Migration (v1)

```sql
-- Run via Prisma: npx prisma migrate dev --name init

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'DELIVERING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "payment_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "description" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "network" TEXT NOT NULL DEFAULT 'polygon',
  "token" TEXT NOT NULL DEFAULT 'USDC',
  "tx_hash" TEXT UNIQUE,
  "block_number" INTEGER,
  "confirmations" INTEGER NOT NULL DEFAULT 0,
  "customer_address" TEXT,
  "merchant_address" TEXT NOT NULL,
  "success_url" TEXT,
  "cancel_url" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "completed_at" TIMESTAMP
);

CREATE INDEX "payment_sessions_user_id_status_idx" ON "payment_sessions"("user_id", "status");
CREATE INDEX "payment_sessions_status_created_at_idx" ON "payment_sessions"("status", "created_at");
CREATE INDEX "payment_sessions_tx_hash_idx" ON "payment_sessions"("tx_hash");

-- ... (rest of tables)
```

### Future Migrations

**v2: Add invoice generation**
```sql
ALTER TABLE "payment_sessions" ADD COLUMN "invoice_url" TEXT;
```

**v3: Add multi-currency support**
```sql
ALTER TABLE "payment_sessions" ADD COLUMN "exchange_rate" DECIMAL(10,6);
```

---

## Performance Considerations

### Query Optimization

**Dashboard Query** (most common):
```sql
-- Get merchant's recent completed payments
SELECT * FROM payment_sessions
WHERE user_id = 'usr_abc123'
AND status = 'COMPLETED'
ORDER BY created_at DESC
LIMIT 50;

-- Performance: ~5ms (uses index on user_id + status)
```

**Blockchain Monitor Query** (high frequency):
```sql
-- Find payments awaiting confirmation
SELECT * FROM payment_sessions
WHERE status = 'CONFIRMING'
AND confirmations < 64;

-- Performance: ~10ms (uses index on status)
```

### Connection Pooling

```typescript
// Use PgBouncer for connection pooling
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true"

// Prisma connection pool settings
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Max 20 connections per instance
  connection_limit = 20
}
```

### Partitioning Strategy (Future)

**When to partition**: After 10M+ payment_sessions (expected at ~1 year)

```sql
-- Partition by month
CREATE TABLE payment_sessions_2026_01 PARTITION OF payment_sessions
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE payment_sessions_2026_02 PARTITION OF payment_sessions
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## Backup & Recovery

### Backup Strategy

**Automated Backups** (RDS):
- Frequency: Daily snapshots
- Retention: 30 days
- Window: 02:00-04:00 UTC (low traffic)

**Manual Backups**:
```bash
# Full backup
pg_dump -h localhost -U postgres -d stablecoin_gateway > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres -d stablecoin_gateway < backup_20260127.sql
```

### Point-in-Time Recovery

- **RPO** (Recovery Point Objective): 24 hours (daily snapshots)
- **RTO** (Recovery Time Objective): 4 hours (restore from snapshot)

---

## Data Retention Policy

| Table | Active Data | Archive After | Deletion After |
|-------|-------------|---------------|----------------|
| users | Indefinite | - | On user request (GDPR) |
| payment_sessions | Indefinite | 2 years (to S3) | 7 years (compliance) |
| refunds | Indefinite | 2 years (to S3) | 7 years (compliance) |
| api_keys | Indefinite | On revocation | 90 days after revocation |
| webhook_endpoints | Indefinite | On deletion | 30 days after deletion |
| webhook_deliveries | 7 days (succeeded) | 7 days | 90 days (failed) |

---

## Security Measures

1. **Encryption at Rest**: PostgreSQL native encryption (LUKS)
2. **Encryption in Transit**: SSL/TLS for all database connections
3. **Access Control**: Principle of least privilege (separate DB users for API, workers)
4. **Audit Logging**: Enable PostgreSQL audit logs for sensitive tables
5. **No PII in Logs**: Never log full wallet addresses or API keys

---

**End of Database Schema Document**
