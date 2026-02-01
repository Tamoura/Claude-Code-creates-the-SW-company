# InvoiceForge

AI-powered invoice and proposal generator for freelancers, consultants, and small agencies.

## What is InvoiceForge?

Describe your work in plain English. Get a professional, formatted invoice in seconds.

**Example:**
> "I built a React dashboard for Acme Corp over 3 weeks, 120 hours at $150/hr, with hosting setup at $500. Apply 8.5% sales tax. Net 30."

InvoiceForge generates a complete invoice with:
- Properly formatted line items
- Tax calculations
- Professional PDF layout
- Optional Stripe payment link

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm

### Setup

1. Clone and navigate:
   ```bash
   cd products/invoiceforge
   ```

2. Install dependencies:
   ```bash
   # Install product dependencies
   npm install

   # Install API dependencies
   cd apps/api && npm install && cd ../..

   # Install web dependencies
   cd apps/web && npm install && cd ../..
   ```

3. Set up the database:
   ```bash
   createdb invoiceforge_dev
   cd apps/api
   cp .env.example .env
   # Edit .env with your database URL and secrets
   npx prisma migrate dev
   cd ../..
   ```

4. Start development:
   ```bash
   npm run dev
   # API: http://localhost:5004
   # Web: http://localhost:3109
   ```

### Docker Alternative
```bash
docker compose up -d
# API: http://localhost:5004 (with PostgreSQL included)
```

## Architecture

```
Browser -> Next.js (3109) -> Fastify API (5004) -> PostgreSQL
                                  |
                          +-------+-------+
                          |       |       |
                       Claude   Stripe  SendGrid
                        API      API     (email)
```

Monolith backend with clean module separation. No microservices. Each API module follows the Route-Handler-Service pattern with Zod validation at boundaries.

### Backend Modules

| Module | Responsibility |
|--------|---------------|
| `auth` | Registration, login, JWT, Google OAuth, password reset |
| `invoices` | CRUD, AI generation, PDF export, payment links |
| `clients` | CRUD, fuzzy matching |
| `users` | Profile, subscription management |
| `webhooks` | Stripe event processing |
| `health` | Readiness/liveness checks |

## API Endpoints

### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | No |

### Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/google` | Authenticate with Google OAuth | No |
| POST | `/api/auth/logout` | Logout and invalidate session | Yes |
| POST | `/api/auth/forgot-password` | Request password reset email | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |

### Invoices

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/invoices/generate` | AI invoice generation from natural language | Yes |
| GET | `/api/invoices` | List invoices (filterable, paginated) | Yes |
| GET | `/api/invoices/:id` | Get single invoice with line items | Yes |
| PUT | `/api/invoices/:id` | Update an invoice | Yes |
| DELETE | `/api/invoices/:id` | Delete a draft invoice | Yes |
| POST | `/api/invoices/:id/send` | Mark as sent, generate shareable link | Yes |
| GET | `/api/invoices/:id/pdf` | Download invoice as PDF | Yes |
| POST | `/api/invoices/:id/payment-link` | Create Stripe payment link | Yes |
| GET | `/api/invoices/public/:token` | Public invoice view (shareable) | No |

### Clients

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/clients` | List clients (searchable, paginated) | Yes |
| POST | `/api/clients` | Create a new client | Yes |
| GET | `/api/clients/:id` | Get client with invoice history | Yes |
| PUT | `/api/clients/:id` | Update client details | Yes |
| DELETE | `/api/clients/:id` | Delete a client | Yes |

### Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/users/me` | Get current user profile | Yes |
| PUT | `/api/users/me` | Update user profile | Yes |
| GET | `/api/users/me/subscription` | Get subscription details and usage | Yes |

### Webhooks

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/webhooks/stripe` | Stripe webhook receiver | Stripe signature |

For full request/response schemas, see [docs/API.md](docs/API.md).

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5+ |
| Frontend | Next.js + React | 14.x / 18.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Fastify | 5.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 15+ |
| AI | Anthropic Claude API | claude-sonnet-4-20250514 |
| Payments | Stripe | Connect + Checkout + Billing |
| PDF | @react-pdf/renderer | 3.x |
| Validation | Zod | 4.x |
| Testing | Jest, RTL, Playwright | - |

## Development

### Running Tests
```bash
# All tests
npm test

# API tests (from product root)
cd apps/api && npm test

# Watch mode
cd apps/api && npm run test:watch

# E2E tests
cd e2e && npm test
```

### Database Commands
```bash
cd apps/api

# Open Prisma Studio (visual DB editor)
npm run db:studio

# Run migrations
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate

# Deploy migrations (production)
npm run db:deploy
```

### Project Structure

```
products/invoiceforge/
├── apps/
│   ├── api/                         # Backend API (Fastify)
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── migrations/          # Migration history
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # Authentication module
│   │   │   │   ├── invoices/        # Invoice CRUD + AI generation
│   │   │   │   ├── clients/         # Client management
│   │   │   │   ├── users/           # User profiles
│   │   │   │   └── health/          # Health checks
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts          # JWT auth plugin
│   │   │   │   └── prisma.ts        # Prisma client plugin
│   │   │   ├── lib/
│   │   │   │   ├── errors.ts        # Error handling
│   │   │   │   └── pagination.ts    # Pagination helpers
│   │   │   ├── config.ts            # Environment config
│   │   │   ├── app.ts              # Fastify app setup
│   │   │   └── server.ts           # Server entrypoint
│   │   ├── tests/                   # API tests
│   │   └── package.json
│   └── web/                         # Frontend (Next.js)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (marketing)/     # Public pages (landing, login, signup, pricing)
│       │   │   └── (dashboard)/     # Authenticated pages (dashboard, invoices, clients)
│       │   ├── components/          # Shared UI components
│       │   └── lib/                 # Utilities
│       └── package.json
├── docs/
│   ├── PRD.md                       # Product Requirements Document
│   ├── API.md                       # API documentation
│   ├── DEVELOPMENT.md               # Development guide
│   ├── architecture.md              # Architecture design
│   ├── api-schema.yml               # OpenAPI 3.0 spec
│   ├── db-schema.sql                # Raw SQL schema
│   └── ADRs/                        # Architecture Decision Records
│       ├── ADR-001-ai-provider.md
│       ├── ADR-002-pdf-generation.md
│       └── ADR-003-payment-integration.md
├── e2e/                             # End-to-end tests (Playwright)
├── packages/                        # Product-specific shared code
├── docker-compose.yml               # Docker setup (API + PostgreSQL)
├── Dockerfile                       # API container build
└── package.json                     # Monorepo root scripts
```

## Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3109 |
| Backend API (Fastify) | 5004 |
| Database (PostgreSQL) | 5432 |

## License

Proprietary - ConnectSW
