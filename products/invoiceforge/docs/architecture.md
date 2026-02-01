# InvoiceForge -- System Architecture

**Version**: 1.0
**Status**: Accepted
**Architect**: Claude Architect
**Last Updated**: 2026-02-01

---

## 1. System Overview

InvoiceForge is a monolith web application with clean module separation.
The system has three main layers: a Next.js frontend, a Fastify API backend,
and a PostgreSQL database. External integrations connect to Anthropic Claude
(AI invoice generation), Stripe (payments), and an email service (transactional
emails).

### 1.1 High-Level System Diagram

```
                            +---------------------+
                            |     Web Browser      |
                            +----------+----------+
                                       |
                                       | HTTPS
                                       v
                     +-----------------+------------------+
                     |         Next.js Frontend           |
                     |         (Port 3109)                |
                     |                                    |
                     |  Pages:                            |
                     |  - Landing, Auth, Dashboard        |
                     |  - Invoice Creator (AI input)      |
                     |  - Invoice Preview/Editor          |
                     |  - Client Management               |
                     |  - Settings, Billing               |
                     |  - Public Invoice View             |
                     +-----------------+------------------+
                                       |
                                       | REST API (JSON)
                                       v
                     +-----------------+------------------+
                     |         Fastify Backend            |
                     |         (Port 5004)                |
                     |                                    |
                     |  Modules:                          |
                     |  - auth/    (JWT, OAuth, sessions) |
                     |  - invoices/ (CRUD, AI gen, PDF)   |
                     |  - clients/  (CRUD)                |
                     |  - users/    (profile, billing)    |
                     |  - webhooks/ (Stripe callbacks)    |
                     |  - health/   (readiness, liveness) |
                     +-+-------+-------+-------+---------+
                       |       |       |       |
              +--------+  +----+   +---+   +---+--------+
              v           v        v       v             v
     +--------+--+ +------+--+ +--+----+ +-+----------+ +---------+
     | PostgreSQL | | Claude  | | Stripe| | Email Svc  | | File    |
     | (Prisma)   | | API     | | API   | | (SendGrid) | | Storage |
     | Port 5432  | |         | |       | |            | | (Local/ |
     +------------+ +---------+ +-------+ +------------+ |  S3)   |
                                                          +--------+
```

### 1.2 Component Descriptions

| Component | Purpose | Technology |
|-----------|---------|------------|
| Frontend | SPA with SSR for public pages. Handles UI, form state, invoice preview rendering. | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Backend | REST API server. Business logic, AI orchestration, PDF generation, auth. | Fastify, TypeScript, Node.js 20+ |
| Database | Persistent storage for users, clients, invoices, sessions. | PostgreSQL 15, Prisma ORM |
| AI Service | Parses natural language into structured invoice JSON. | Anthropic Claude API (claude-sonnet-4-20250514) |
| Payments | Stripe Connect for merchant onboarding, Checkout for payment links, Billing for subscriptions. | Stripe API |
| PDF Engine | Server-side PDF generation from invoice data. | @react-pdf/renderer |
| Email | Transactional emails: welcome, password reset, payment notifications. | SendGrid (or AWS SES) |

### 1.3 Data Flow

**Invoice Creation Flow:**

```
1. User types natural language description in frontend
2. Frontend sends POST /api/invoices/generate with { prompt, clientId? }
3. Backend validates input (Zod schema), checks subscription limits
4. Backend calls Claude API with structured system prompt + user input
5. Claude returns structured JSON: { client, lineItems, taxRate, dueDate }
6. Backend calculates totals (server-side, not trusting AI math)
7. Backend matches client name against saved clients (fuzzy match)
8. Backend saves invoice as Draft, returns full invoice object
9. Frontend renders editable preview
10. User edits fields, frontend sends PUT /api/invoices/:id
11. User finalizes: downloads PDF or copies share link
12. Status transitions to Sent
```

**Payment Flow:**

```
1. User toggles "Include Payment Link" on invoice
2. Frontend sends POST /api/invoices/:id/payment-link
3. Backend creates Stripe Checkout Session via user's connected Stripe account
4. Backend saves session ID and payment URL on invoice record
5. Client clicks payment link in PDF or web view
6. Client completes payment on Stripe Checkout page
7. Stripe sends checkout.session.completed webhook to POST /api/webhooks/stripe
8. Backend verifies webhook signature, matches invoice by metadata
9. Backend updates invoice status to Paid, records paid_at timestamp
10. Frontend polls or uses optimistic update to show new status
```

---

## 2. Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Node.js | 20+ | LTS, stable, team standard |
| **Language** | TypeScript | 5+ | Type safety, better DX, company standard |
| **Frontend Framework** | Next.js | 14 | SSR for SEO (landing, public invoice), App Router, company standard |
| **UI Library** | React | 18 | Company standard, mature ecosystem |
| **Styling** | Tailwind CSS | 3 | Utility-first, fast iteration, company standard |
| **Component Library** | shadcn/ui | latest | Accessible, customizable, built on Radix UI |
| **Backend Framework** | Fastify | 4 | High performance, schema validation, company standard |
| **ORM** | Prisma | 5 | Type-safe queries, migrations, company standard |
| **Database** | PostgreSQL | 15+ | Relational data model, JSONB for flexibility, company standard |
| **AI** | Anthropic Claude API | claude-sonnet-4-20250514 | Structured output, strong instruction following (see ADR-001) |
| **Payments** | Stripe | latest | Connect + Checkout + Billing, industry standard (see ADR-003) |
| **PDF** | @react-pdf/renderer | 3 | React-based, no headless browser needed (see ADR-002) |
| **Auth** | Custom JWT + bcrypt | - | JWT access tokens (1hr), refresh tokens (7d), bcrypt cost 12 |
| **Validation** | Zod | 3 | Runtime type validation, integrates with Fastify and frontend |
| **HTTP Client** | undici / fetch | - | Built into Node.js 20, used for Claude API and Stripe calls |
| **Testing (Unit)** | Jest | 29 | Company standard |
| **Testing (Component)** | React Testing Library | 14 | Company standard |
| **Testing (E2E)** | Playwright | latest | Company standard |
| **Linting** | ESLint + Prettier | - | Company standard |

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Official Anthropic SDK for Claude API calls |
| `stripe` | Official Stripe SDK for Connect, Checkout, Billing, Webhooks |
| `@react-pdf/renderer` | Server-side PDF generation with React components |
| `bcrypt` | Password hashing (cost factor 12) |
| `jsonwebtoken` | JWT creation and verification |
| `zod` | Schema validation for API inputs and AI outputs |
| `date-fns` | Date manipulation (due dates, Net 30 calculations) |
| `fuse.js` | Fuzzy string matching for client name auto-matching |
| `@fastify/cors` | CORS middleware |
| `@fastify/helmet` | Security headers |
| `@fastify/rate-limit` | Rate limiting |
| `@fastify/cookie` | Cookie handling for refresh tokens |
| `google-auth-library` | Google OAuth token verification |
| `slugify` | Client name slugification for PDF filenames |

---

## 3. API Design

All endpoints are prefixed with `/api`. Authentication is via Bearer token
(JWT) in the Authorization header unless otherwise noted.

### 3.1 Auth Endpoints

#### POST /api/auth/register

Create a new user account with email and password.

- **Auth**: None
- **Rate Limit**: 10/minute per IP
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "MySecure1Pass",
    "name": "Jane Doe",
    "businessName": "Jane Doe Consulting"
  }
  ```
- **Response** (201):
  ```json
  {
    "user": { "id": "uuid", "email": "...", "name": "..." },
    "accessToken": "jwt...",
    "refreshToken": "rt_..."
  }
  ```
- **Errors**: 400 (validation), 409 (email exists)

#### POST /api/auth/login

Authenticate with email and password.

- **Auth**: None
- **Rate Limit**: 20/minute per IP
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "MySecure1Pass"
  }
  ```
- **Response** (200):
  ```json
  {
    "user": { "id": "uuid", "email": "...", "name": "..." },
    "accessToken": "jwt...",
    "refreshToken": "rt_..."
  }
  ```
- **Errors**: 401 (invalid credentials)

#### POST /api/auth/refresh

Exchange a refresh token for a new access token.

- **Auth**: None (refresh token in body or cookie)
- **Request Body**:
  ```json
  {
    "refreshToken": "rt_..."
  }
  ```
- **Response** (200):
  ```json
  {
    "accessToken": "jwt...",
    "refreshToken": "rt_..."
  }
  ```
- **Errors**: 401 (expired/invalid token)

#### POST /api/auth/google

Authenticate via Google OAuth. Creates account if new user.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "idToken": "google_id_token..."
  }
  ```
- **Response** (200):
  ```json
  {
    "user": { "id": "uuid", "email": "...", "name": "..." },
    "accessToken": "jwt...",
    "refreshToken": "rt_..."
  }
  ```
- **Errors**: 401 (invalid Google token)

#### POST /api/auth/logout

Invalidate the current session.

- **Auth**: Required (Bearer token)
- **Request Body**: None
- **Response** (204): No content
- **Errors**: 401 (unauthorized)

#### POST /api/auth/forgot-password

Request a password reset email.

- **Auth**: None
- **Rate Limit**: 5/minute per IP
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "If the email exists, a reset link has been sent."
  }
  ```
- **Notes**: Always returns 200 to prevent email enumeration.

#### POST /api/auth/reset-password

Reset password using a token from the email link.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "token": "reset_token...",
    "password": "NewSecure1Pass"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Password reset successfully."
  }
  ```
- **Errors**: 400 (invalid/expired token)

---

### 3.2 Invoice Endpoints

#### POST /api/invoices/generate

The core AI endpoint. Takes natural language input and returns a structured
invoice. This is the product's primary innovation.

- **Auth**: Required
- **Rate Limit**: 60/minute per user
- **Request Body**:
  ```json
  {
    "prompt": "Built React dashboard for Acme Corp, 120 hours at $150/hr. Hosting setup, $500 flat. Apply 8.5% tax.",
    "clientId": "uuid-or-null"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": "uuid",
    "invoiceNumber": "INV-0003",
    "status": "draft",
    "client": {
      "id": "uuid-or-null",
      "name": "Acme Corp",
      "email": null,
      "address": null,
      "matched": true
    },
    "items": [
      {
        "id": "uuid",
        "description": "React dashboard development",
        "quantity": 120,
        "unitPrice": 15000,
        "amount": 1800000,
        "sortOrder": 1
      },
      {
        "id": "uuid",
        "description": "Hosting setup",
        "quantity": 1,
        "unitPrice": 50000,
        "amount": 50000,
        "sortOrder": 2
      }
    ],
    "subtotal": 1850000,
    "taxRate": 850,
    "taxAmount": 157250,
    "total": 2007250,
    "currency": "USD",
    "invoiceDate": "2026-02-01",
    "dueDate": "2026-03-03",
    "notes": null,
    "aiPrompt": "Built React dashboard for Acme Corp...",
    "createdAt": "2026-02-01T12:00:00Z"
  }
  ```
- **Errors**: 400 (input too short/ambiguous), 402 (subscription limit reached), 503 (AI service unavailable)
- **Notes**: All monetary values are in cents (integer). taxRate is basis points (850 = 8.50%). The backend recalculates all math server-side; it does not trust the AI's arithmetic.

#### GET /api/invoices

List invoices for the authenticated user.

- **Auth**: Required
- **Query Params**:
  - `status` (optional): `draft`, `sent`, `paid`, `overdue`
  - `search` (optional): search client name or invoice number
  - `page` (optional, default 1): page number
  - `limit` (optional, default 25, max 100): items per page
  - `sortBy` (optional, default `createdAt`): `createdAt`, `dueDate`, `total`
  - `sortOrder` (optional, default `desc`): `asc`, `desc`
- **Response** (200):
  ```json
  {
    "invoices": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 47,
      "totalPages": 2
    },
    "summary": {
      "totalOutstanding": 450000,
      "totalPaidThisMonth": 1200000,
      "invoicesCreatedThisMonth": 8
    }
  }
  ```

#### GET /api/invoices/:id

Get a single invoice with all details and line items.

- **Auth**: Required (owner only)
- **Response** (200): Full invoice object with items and client
- **Errors**: 404 (not found or not owned by user)

#### PUT /api/invoices/:id

Update an invoice (editing fields, line items, etc.).

- **Auth**: Required (owner only)
- **Request Body**: Partial invoice object (only changed fields)
  ```json
  {
    "clientId": "uuid",
    "dueDate": "2026-03-15",
    "taxRate": 1000,
    "notes": "Thank you for your business!",
    "items": [
      {
        "id": "existing-uuid",
        "description": "Updated description",
        "quantity": 130,
        "unitPrice": 15000
      },
      {
        "description": "New line item",
        "quantity": 1,
        "unitPrice": 25000
      }
    ]
  }
  ```
- **Response** (200): Updated invoice object with recalculated totals
- **Errors**: 400 (validation), 404 (not found)
- **Notes**: Items without an `id` field are created as new. Items with an `id` are updated. Items present in the database but absent from the request are deleted.

#### DELETE /api/invoices/:id

Delete a draft invoice. Sent/paid/overdue invoices cannot be deleted.

- **Auth**: Required (owner only)
- **Response** (204): No content
- **Errors**: 403 (cannot delete non-draft), 404 (not found)

#### POST /api/invoices/:id/send

Mark an invoice as sent. Generates the shareable link.

- **Auth**: Required (owner only)
- **Response** (200):
  ```json
  {
    "status": "sent",
    "shareableLink": "https://invoiceforge.app/invoice/{token}/view"
  }
  ```
- **Errors**: 400 (already sent/paid), 404 (not found)

#### GET /api/invoices/:id/pdf

Generate and download the invoice as a PDF.

- **Auth**: Required (owner only) OR valid public share token
- **Response** (200): Binary PDF file
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename="INV-0003-acme-corp.pdf"`
- **Errors**: 404 (not found)

#### POST /api/invoices/:id/payment-link

Create a Stripe Checkout Session payment link for the invoice.

- **Auth**: Required (owner only, Stripe account connected)
- **Response** (200):
  ```json
  {
    "paymentLink": "https://checkout.stripe.com/c/pay/cs_...",
    "stripeSessionId": "cs_..."
  }
  ```
- **Errors**: 400 (Stripe not connected), 404 (not found)

---

### 3.3 Client Endpoints

#### GET /api/clients

List all clients for the authenticated user.

- **Auth**: Required
- **Query Params**:
  - `search` (optional): search by name or email
  - `page` (optional, default 1)
  - `limit` (optional, default 50, max 100)
- **Response** (200):
  ```json
  {
    "clients": [ ... ],
    "pagination": { "page": 1, "limit": 50, "total": 12, "totalPages": 1 }
  }
  ```

#### POST /api/clients

Create a new client.

- **Auth**: Required
- **Request Body**:
  ```json
  {
    "name": "Acme Corp",
    "email": "billing@acme.com",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US",
    "phone": "+1-555-0100",
    "notes": "Net 30 terms, primary contact is Jane"
  }
  ```
- **Response** (201): Created client object
- **Errors**: 400 (validation -- name required)

#### GET /api/clients/:id

Get a single client with their invoice history.

- **Auth**: Required (owner only)
- **Response** (200):
  ```json
  {
    "client": { ... },
    "invoices": [ ... ]
  }
  ```
- **Errors**: 404 (not found)

#### PUT /api/clients/:id

Update client details.

- **Auth**: Required (owner only)
- **Request Body**: Partial client object
- **Response** (200): Updated client object
- **Errors**: 400, 404

#### DELETE /api/clients/:id

Delete a client. Invoices for this client are preserved (client_id set to null).

- **Auth**: Required (owner only)
- **Response** (204): No content
- **Errors**: 404 (not found)

---

### 3.4 User Endpoints

#### GET /api/users/me

Get the authenticated user's profile.

- **Auth**: Required
- **Response** (200):
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "businessName": "Jane Doe Consulting",
    "subscriptionTier": "free",
    "invoiceCountThisMonth": 3,
    "invoiceLimitThisMonth": 5,
    "stripeConnected": true,
    "createdAt": "2026-01-15T10:00:00Z"
  }
  ```

#### PUT /api/users/me

Update user profile.

- **Auth**: Required
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "businessName": "Smith Consulting LLC"
  }
  ```
- **Response** (200): Updated user object
- **Errors**: 400 (validation)

#### GET /api/users/me/subscription

Get subscription details and usage.

- **Auth**: Required
- **Response** (200):
  ```json
  {
    "tier": "free",
    "invoicesUsedThisMonth": 3,
    "invoicesRemainingThisMonth": 2,
    "resetDate": "2026-03-01T00:00:00Z",
    "stripeCustomerId": null,
    "stripeSubscriptionId": null
  }
  ```

---

### 3.5 Webhook Endpoints

#### POST /api/webhooks/stripe

Stripe webhook receiver. Handles payment events.

- **Auth**: Stripe webhook signature verification (not JWT)
- **Events Handled**:
  - `checkout.session.completed` -- mark invoice as paid
  - `customer.subscription.updated` -- update user subscription tier
  - `customer.subscription.deleted` -- downgrade to free tier
- **Response** (200): `{ "received": true }`
- **Notes**: Idempotent. Checks invoice status before updating.

---

### 3.6 Public Endpoints

#### GET /api/invoices/public/:token

Get invoice data for the public shareable view. No auth required.

- **Auth**: None (token-based access)
- **Response** (200): Invoice with client and items (no sensitive user data)
- **Errors**: 404 (invalid token)

---

### 3.7 Health Endpoint

#### GET /api/health

Health check for load balancers and monitoring.

- **Auth**: None
- **Response** (200):
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "uptime": 86400,
    "database": "connected"
  }
  ```

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
                          +------------------+
                          |      users       |
                          +------------------+
                          | id (PK)          |
                          | email (unique)   |
                          | name             |
                          | business_name    |
                          | password_hash    |
                          | google_id        |
                          | subscription_tier|
                          | invoice_count    |
                          | counter_reset_at |
                          | invoice_counter  |
                          | stripe_customer  |
                          | stripe_account   |
                          | created_at       |
                          | updated_at       |
                          +--------+---------+
                                   |
                     +-------------+-------------+
                     |             |             |
                     v             v             v
            +--------+---+ +------+------+ +----+-------+
            |  clients   | |  invoices   | |  sessions  |
            +------------+ +-------------+ +------------+
            | id (PK)    | | id (PK)     | | id (PK)    |
            | user_id(FK)| | user_id(FK) | | user_id(FK)|
            | name       | | client_id   | | token      |
            | email      | | inv_number  | | expires_at |
            | address    | | status      | | created_at |
            | city       | | due_date    | +------------+
            | state      | | subtotal    |
            | zip        | | tax_rate    |
            | country    | | tax_amount  |
            | phone      | | total       |
            | notes      | | currency    |
            | created_at | | notes       |
            | updated_at | | ai_prompt   |
            +------------+ | share_token |
                           | payment_link|
                           | stripe_sess |
                           | paid_at     |
                           | sent_at     |
                           | created_at  |
                           | updated_at  |
                           +------+------+
                                  |
                                  v
                         +--------+--------+
                         | invoice_items   |
                         +-----------------+
                         | id (PK)         |
                         | invoice_id (FK) |
                         | description     |
                         | quantity         |
                         | unit_price       |
                         | amount           |
                         | sort_order       |
                         +-----------------+
```

### 4.2 Design Decisions

- **Monetary values stored as integers (cents)**: Avoids floating-point
  rounding errors. $150.00 is stored as `15000`. Tax rate 8.50% is stored
  as `850` (basis points).
- **Invoice counter per user**: Each user has `invoice_counter` (incrementing
  integer) used to generate `INV-NNNN` numbers. Never decrements.
- **Soft status management**: Invoice status is a string enum, not a boolean.
  Supports the Draft -> Sent -> Paid/Overdue workflow.
- **Share tokens**: Random UUID tokens on invoices enable public access
  without authentication. Separate from the invoice primary key.
- **Client nullable on invoice**: If a client is deleted, the invoice
  retains its data but `client_id` becomes null.
- **Timestamps**: All tables use `created_at` / `updated_at` with timezone.
- **Indexes**: On user_id foreign keys, invoice status, share_token, email
  fields for query performance.

### 4.3 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SubscriptionTier {
  free
  pro
  team
}

enum InvoiceStatus {
  draft
  sent
  paid
  overdue
}

model User {
  id                    String           @id @default(uuid())
  email                 String           @unique
  name                  String
  businessName          String?          @map("business_name")
  passwordHash          String?          @map("password_hash")
  googleId              String?          @unique @map("google_id")
  subscriptionTier      SubscriptionTier @default(free) @map("subscription_tier")
  invoiceCountThisMonth Int              @default(0) @map("invoice_count_this_month")
  counterResetAt        DateTime         @default(now()) @map("counter_reset_at")
  invoiceCounter        Int              @default(0) @map("invoice_counter")
  stripeCustomerId      String?          @map("stripe_customer_id")
  stripeAccountId       String?          @map("stripe_account_id")
  createdAt             DateTime         @default(now()) @map("created_at")
  updatedAt             DateTime         @updatedAt @map("updated_at")

  clients  Client[]
  invoices Invoice[]
  sessions Session[]

  @@map("users")
}

model Client {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  email     String?
  address   String?
  city      String?
  state     String?
  zip       String?
  country   String?  @default("US")
  phone     String?
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  invoices Invoice[]

  @@index([userId])
  @@index([userId, name])
  @@map("clients")
}

model Invoice {
  id              String        @id @default(uuid())
  userId          String        @map("user_id")
  clientId        String?       @map("client_id")
  invoiceNumber   String        @map("invoice_number")
  status          InvoiceStatus @default(draft)
  invoiceDate     DateTime      @default(now()) @map("invoice_date")
  dueDate         DateTime      @map("due_date")
  subtotal        Int           @default(0)
  taxRate         Int           @default(0) @map("tax_rate")
  taxAmount       Int           @default(0) @map("tax_amount")
  total           Int           @default(0)
  currency        String        @default("USD")
  notes           String?
  aiPrompt        String?       @map("ai_prompt")
  shareToken      String?       @unique @map("share_token")
  paymentLink     String?       @map("payment_link")
  stripeSessionId String?       @map("stripe_session_id")
  paidAt          DateTime?     @map("paid_at")
  sentAt          DateTime?     @map("sent_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  client Client?       @relation(fields: [clientId], references: [id], onDelete: SetNull)
  items  InvoiceItem[]

  @@index([userId])
  @@index([userId, status])
  @@index([shareToken])
  @@index([stripeSessionId])
  @@map("invoices")
}

model InvoiceItem {
  id          String @id @default(uuid())
  invoiceId   String @map("invoice_id")
  description String
  quantity    Int    @default(1)
  unitPrice   Int    @map("unit_price")
  amount      Int
  sortOrder   Int    @default(0) @map("sort_order")

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("invoice_items")
}

model Session {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@map("sessions")
}
```

---

## 5. Module Structure

The backend follows clean module separation within a monolith. Each domain
has its own directory with routes, handlers, services, and validation schemas.

```
apps/api/src/
  ├── server.ts              # Fastify instance setup, plugin registration
  ├── config.ts              # Environment variables, app configuration
  ├── modules/
  │   ├── auth/
  │   │   ├── auth.routes.ts       # Route definitions
  │   │   ├── auth.handlers.ts     # Request handlers
  │   │   ├── auth.service.ts      # Business logic (hash, verify, JWT)
  │   │   ├── auth.schemas.ts      # Zod validation schemas
  │   │   └── auth.test.ts         # Unit tests
  │   ├── invoices/
  │   │   ├── invoices.routes.ts
  │   │   ├── invoices.handlers.ts
  │   │   ├── invoices.service.ts  # CRUD, total calculation
  │   │   ├── invoices.ai.ts       # Claude API integration, prompt
  │   │   ├── invoices.pdf.ts      # PDF generation logic
  │   │   ├── invoices.schemas.ts
  │   │   └── invoices.test.ts
  │   ├── clients/
  │   │   ├── clients.routes.ts
  │   │   ├── clients.handlers.ts
  │   │   ├── clients.service.ts
  │   │   ├── clients.schemas.ts
  │   │   └── clients.test.ts
  │   ├── users/
  │   │   ├── users.routes.ts
  │   │   ├── users.handlers.ts
  │   │   ├── users.service.ts
  │   │   ├── users.schemas.ts
  │   │   └── users.test.ts
  │   ├── webhooks/
  │   │   ├── webhooks.routes.ts
  │   │   ├── webhooks.handlers.ts
  │   │   ├── webhooks.stripe.ts   # Stripe webhook processing
  │   │   └── webhooks.test.ts
  │   └── health/
  │       ├── health.routes.ts
  │       └── health.test.ts
  ├── lib/
  │   ├── prisma.ts          # Prisma client singleton
  │   ├── stripe.ts          # Stripe client initialization
  │   ├── claude.ts          # Anthropic client initialization
  │   ├── jwt.ts             # JWT utilities
  │   └── errors.ts          # Custom error classes
  ├── middleware/
  │   ├── authenticate.ts    # JWT verification middleware
  │   └── rateLimit.ts       # Rate limiting configuration
  └── types/
      └── index.ts           # Shared TypeScript types
```

Frontend follows Next.js App Router conventions:

```
apps/web/src/
  ├── app/
  │   ├── layout.tsx                    # Root layout
  │   ├── page.tsx                      # Landing page (/)
  │   ├── (auth)/
  │   │   ├── login/page.tsx
  │   │   ├── signup/page.tsx
  │   │   ├── forgot-password/page.tsx
  │   │   └── reset-password/page.tsx
  │   ├── dashboard/
  │   │   ├── layout.tsx                # Dashboard layout (sidebar, nav)
  │   │   ├── page.tsx                  # Dashboard home
  │   │   ├── invoices/
  │   │   │   ├── page.tsx              # Invoice list
  │   │   │   ├── new/page.tsx          # AI invoice creation
  │   │   │   └── [id]/
  │   │   │       ├── page.tsx          # Invoice detail
  │   │   │       └── edit/page.tsx     # Invoice editor
  │   │   ├── clients/
  │   │   │   ├── page.tsx              # Client list
  │   │   │   ├── new/page.tsx          # New client
  │   │   │   └── [id]/page.tsx         # Client detail
  │   │   └── settings/
  │   │       ├── page.tsx              # General settings
  │   │       └── billing/page.tsx      # Subscription management
  │   ├── invoice/
  │   │   └── [token]/
  │   │       ├── view/page.tsx         # Public invoice view
  │   │       └── pay/page.tsx          # Payment page
  │   └── pricing/page.tsx
  ├── components/
  │   ├── ui/                  # shadcn/ui components
  │   ├── invoice/
  │   │   ├── InvoicePreview.tsx
  │   │   ├── InvoiceEditor.tsx
  │   │   ├── InvoiceAIInput.tsx
  │   │   ├── InvoiceLineItem.tsx
  │   │   └── InvoiceStatusBadge.tsx
  │   ├── client/
  │   │   ├── ClientForm.tsx
  │   │   └── ClientSelect.tsx
  │   ├── dashboard/
  │   │   ├── Sidebar.tsx
  │   │   ├── SummaryCards.tsx
  │   │   └── InvoiceTable.tsx
  │   └── shared/
  │       ├── Header.tsx
  │       └── LoadingSpinner.tsx
  ├── lib/
  │   ├── api.ts              # API client (fetch wrapper)
  │   ├── auth.ts             # Auth context, token management
  │   └── utils.ts            # Formatting (cents to dollars, dates)
  └── types/
      └── index.ts            # Shared frontend types
```

---

## 6. AI Invoice Generation Design

The AI generation endpoint is the core product feature. Its design
prioritizes accuracy, predictability, and graceful error handling.

### 6.1 Prompt Architecture

```
System Prompt (fixed, stored in code):
  - Role: "You are an invoice data extraction assistant."
  - Output format: JSON schema definition
  - Rules: Never hallucinate amounts, always extract from user text
  - Units: Recognize hours, days, items, flat fee, percentage
  - Tax: Parse tax instructions; default 0 if not mentioned
  - Due date: Parse date instructions; default Net 30
  - Error: If insufficient info, return error object

User Prompt (dynamic, from user input):
  - The user's natural language description (max 2,000 chars)
  - Saved client names list (for matching hints)
```

### 6.2 AI Response Schema (Zod validated)

```typescript
const AIInvoiceResponseSchema = z.object({
  success: z.literal(true),
  clientName: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),  // in dollars
    unitType: z.enum(['hours', 'days', 'items', 'flat', 'percentage']),
  })),
  taxRate: z.number().min(0).max(100),  // percentage
  dueDateDays: z.number().int().positive().default(30),
  notes: z.string().nullable(),
});

const AIInvoiceErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  missingFields: z.array(z.string()),
});
```

### 6.3 Server-Side Calculation

The backend NEVER trusts the AI's arithmetic. After receiving the AI
response, the backend:

1. Converts dollar amounts to cents (multiply by 100, round)
2. Calculates each line item amount: `quantity * unitPrice`
3. Calculates subtotal: sum of all line item amounts
4. Calculates tax: `subtotal * (taxRate / 10000)` using banker's rounding
5. Calculates total: `subtotal + taxAmount`

This ensures invoice totals are always mathematically correct regardless
of what the AI returns.

### 6.4 Fallback Behavior

If the Claude API is unavailable or returns an error:

1. Return a 503 with a clear message to the frontend
2. Frontend shows manual invoice form as fallback
3. User can create invoices without AI (fill in fields manually)

---

## 7. Security Architecture

### 7.1 Authentication

```
Access Token (JWT):
  - Algorithm: HS256
  - Expiry: 1 hour
  - Payload: { sub: userId, email, tier }
  - Stored: Client memory (not localStorage for XSS protection)

Refresh Token:
  - Format: Random 256-bit token (rt_<base64>)
  - Expiry: 7 days
  - Stored: HttpOnly cookie + database (sessions table)
  - Rotation: New refresh token issued on each use
  - Revocation: Delete from sessions table on logout

Password:
  - Hash: bcrypt with cost factor 12
  - Validation: Min 8 chars, 1 uppercase, 1 number
  - Reset: Token-based, 1-hour expiry, single-use
```

### 7.2 Authorization

- Resource ownership: All queries filter by `userId` from JWT
- No role-based access in MVP (single-user accounts)
- Public invoice view: Token-based access (share_token), no auth
- Stripe webhooks: Signature verification using webhook signing secret

### 7.3 Input Validation

- All API inputs validated with Zod schemas before processing
- AI prompt sanitized: HTML stripped, max 2,000 characters
- Invoice content escaped when rendered in PDF and web views
- SQL injection prevented by Prisma parameterized queries

### 7.4 Rate Limiting

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| POST /api/auth/register | 10 | 1 minute per IP |
| POST /api/auth/login | 20 | 1 minute per IP |
| POST /api/auth/forgot-password | 5 | 1 minute per IP |
| POST /api/invoices/generate | 60 | 1 minute per user |
| All other endpoints | 200 | 1 minute per user |

### 7.5 Security Headers

Applied via `@fastify/helmet`:

- `Content-Security-Policy`: Restrict script sources
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `Strict-Transport-Security`: max-age=31536000

### 7.6 Data Protection

- PCI compliance: No card data stored. All payments through Stripe.
- Stripe API keys: Stored in environment variables, never in code or DB.
- Database: Encrypted at rest (provider-level encryption).
- Transport: TLS 1.3 for all connections.
- AI prompts: Invoice content sent to Claude API is not logged beyond
  the immediate request. The `ai_prompt` field stores the original user
  input for audit purposes.

---

## 8. Scalability Considerations

### 8.1 Current Design (MVP, single-instance)

The MVP runs as a single Fastify instance with a single PostgreSQL
database. This is sufficient for the initial target of 10,000 users
and 50,000 invoices.

### 8.2 Scaling Path

**Horizontal scaling** (when needed):

1. **API servers**: Fastify is stateless (JWT auth, no server sessions).
   Add instances behind a load balancer.
2. **Database**: Add read replicas for dashboard queries. Primary handles
   writes. Connection pooling via PgBouncer.
3. **AI generation**: Already stateless. Rate-limited at the application
   level, backed by Claude API rate limits.
4. **PDF generation**: CPU-bound. Can be offloaded to a queue (BullMQ +
   Redis) if generation time becomes a bottleneck.

**Not needed for MVP**:
- Caching layer (Redis) -- query volumes are low
- CDN for PDFs -- generate on-demand, no caching
- Background job queue -- all operations are synchronous
- WebSocket connections -- polling or optimistic updates are sufficient

### 8.3 Database Indexes

Key indexes for query performance:

- `users.email` (unique, login lookups)
- `clients.user_id` (client list queries)
- `clients.user_id, name` (client auto-matching)
- `invoices.user_id` (dashboard queries)
- `invoices.user_id, status` (filtered dashboard queries)
- `invoices.share_token` (public invoice view lookups)
- `invoices.stripe_session_id` (webhook processing)
- `sessions.token` (auth middleware lookups)

---

## 9. Development & Deployment

### 9.1 Local Development

```bash
# Prerequisites
- Node.js 20+
- PostgreSQL 15 (local or Docker)
- Stripe CLI (for webhook testing)

# Database
createdb invoiceforge_dev
cd apps/api && npx prisma migrate dev

# Backend
cd apps/api && npm run dev      # Port 5004

# Frontend
cd apps/web && npm run dev      # Port 3109

# Stripe webhook forwarding (for local testing)
stripe listen --forward-to localhost:5004/api/webhooks/stripe
```

### 9.2 Environment Variables

```
# Database
DATABASE_URL=postgresql://postgres@localhost:5432/invoiceforge_dev

# Auth
JWT_SECRET=<random-256-bit>
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Email
SENDGRID_API_KEY=SG...
FROM_EMAIL=invoices@invoiceforge.app

# App
APP_URL=http://localhost:3109
API_URL=http://localhost:5004
NODE_ENV=development
```

### 9.3 Deployment Target

- **Frontend**: Vercel (Next.js native hosting)
- **Backend**: Render or Railway (Fastify, auto-deploy from main)
- **Database**: Render PostgreSQL or Supabase
- **Monitoring**: Basic health check endpoint + Render/Railway built-in metrics

---

## 10. Testing Strategy

| Level | Tool | Scope | Target |
|-------|------|-------|--------|
| Unit | Jest | Service functions, calculation logic, validation schemas | 80%+ coverage |
| Integration | Jest + real DB | API endpoints with database, Stripe mock, Claude mock | All endpoints |
| Component | React Testing Library | UI components, form behavior, state management | Key components |
| E2E | Playwright | Full user flows: signup, create invoice, payment | Core flows |

### Key Test Scenarios

1. **AI generation**: Mock Claude API responses, verify server-side math
2. **Invoice lifecycle**: Draft -> Sent -> Paid flow
3. **Subscription limits**: Free tier enforcement at 5 invoices
4. **Stripe webhooks**: Payment confirmation, idempotency
5. **Auth flows**: Register, login, refresh, Google OAuth
6. **PDF generation**: Correct content, file naming
7. **Client matching**: Fuzzy name matching accuracy

---

**End of Architecture Document**
