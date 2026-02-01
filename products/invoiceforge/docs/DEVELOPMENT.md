# InvoiceForge Development Guide

## Prerequisites

- **Node.js** 20+ (LTS)
- **PostgreSQL** 15+ (local or Docker)
- **npm** (comes with Node.js)

Verify your setup:
```bash
node --version   # v20.x.x or higher
psql --version   # 15.x or higher
npm --version    # 10.x or higher
```

## Setting Up the Development Environment

### 1. Navigate to the product directory

```bash
cd products/invoiceforge
```

### 2. Install dependencies

There are three `package.json` files -- the monorepo root plus one for each app:

```bash
# Root dependencies (concurrently for parallel dev servers)
npm install

# API dependencies
cd apps/api && npm install && cd ../..

# Web dependencies
cd apps/web && npm install && cd ../..
```

### 3. Database setup

**Option A: Local PostgreSQL**

```bash
# Create the database
createdb invoiceforge_dev

# Create the test database
createdb invoiceforge_test
```

**Option B: Docker PostgreSQL**

```bash
docker compose up -d db
# PostgreSQL available at localhost:5432
# Database: invoiceforge_dev
# User: postgres / Password: postgres
```

### 4. Configure environment variables

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env` with your values:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/invoiceforge_dev
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-in-production-too
PORT=5004
NODE_ENV=development
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

For local development, `JWT_SECRET` and `JWT_REFRESH_SECRET` can be any string. `ANTHROPIC_API_KEY` and `STRIPE_*` keys are only needed if you are testing AI generation or payment flows.

### 5. Run database migrations

```bash
cd apps/api
npx prisma migrate dev
```

This creates all tables defined in `prisma/schema.prisma` and generates the Prisma client.

### 6. Start development servers

From the product root:

```bash
npm run dev
```

This starts both servers concurrently:
- **API**: http://localhost:5004
- **Web**: http://localhost:3109

To start them individually:

```bash
# API only
npm run dev:api

# Web only
npm run dev:web
```

The API server uses `tsx watch` for hot-reloading on file changes. The web server uses Next.js built-in hot module replacement.

## Database

### Prisma Schema

The source of truth for the database schema is:

```
apps/api/prisma/schema.prisma
```

### Common Database Commands

```bash
cd apps/api

# Run pending migrations
npx prisma migrate dev

# Create a new migration after schema changes
npx prisma migrate dev --name describe_what_changed

# Generate Prisma client (after schema changes, no migration)
npx prisma generate

# Open Prisma Studio (visual database browser)
npx prisma studio

# Deploy migrations in production
npx prisma migrate deploy

# Reset database (drops and recreates)
npx prisma migrate reset
```

### Data Model Overview

| Table | Purpose |
|-------|---------|
| `users` | User accounts, subscription tier, Stripe connections |
| `clients` | Client records (name, email, address) per user |
| `invoices` | Invoice records with totals stored in cents |
| `invoice_items` | Individual line items on an invoice |
| `sessions` | JWT refresh token sessions |
| `password_reset_tokens` | Password reset flow tokens |

Key conventions:
- All monetary values are stored as **integers in cents** (`15000` = $150.00).
- Tax rates are stored as **integers in basis points** (`850` = 8.50%).
- UUIDs are used for all primary keys.
- `updated_at` is automatically maintained by Prisma.

## Running Tests

### API Tests

```bash
cd apps/api

# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx jest --runInBand tests/auth.test.ts
```

Tests use a separate database (`invoiceforge_test`) configured in `apps/api/.env.test`. Tests run with `--runInBand` to avoid parallel database conflicts.

### E2E Tests

End-to-end tests use Playwright and live in the `e2e/` directory:

```bash
cd e2e
npm test
```

### Testing Conventions

- Tests connect to a real PostgreSQL database (no mocks).
- Each test suite cleans up its own data.
- Test files are colocated in `apps/api/tests/`.
- Use `--runInBand` to run tests sequentially (required for shared database).

## Code Structure and Conventions

### Backend (apps/api)

The API follows the **Route-Handler-Service** pattern:

```
modules/
  auth/
    routes.ts      # Defines endpoint paths and HTTP methods
    handlers.ts    # Parses requests, calls services, formats responses
    schemas.ts     # Zod validation schemas for request/response
    service.ts     # Business logic (testable independently)
```

**Routes** register endpoints with Fastify and wire them to handlers. **Handlers** validate input using Zod schemas, call services, and return HTTP responses. **Services** contain all business logic and database operations. They receive plain data and return plain data -- no HTTP concepts.

Plugins in `src/plugins/`:
- `auth.ts` -- JWT authentication decorator (adds `request.user`)
- `prisma.ts` -- Prisma client lifecycle management

Shared utilities in `src/lib/`:
- `errors.ts` -- Custom error classes
- `pagination.ts` -- Pagination helpers

### Frontend (apps/web)

The frontend uses Next.js 14 with the App Router:

```
src/app/
  (marketing)/     # Public route group (landing, login, signup, pricing)
    layout.tsx     # Marketing layout (header, footer)
    page.tsx       # Landing page
    login/
    signup/
    pricing/
  (dashboard)/     # Authenticated route group
    layout.tsx     # Dashboard layout (sidebar, topbar)
    dashboard/
      page.tsx     # Main dashboard
      invoices/
      clients/
      settings/
```

Route groups `(marketing)` and `(dashboard)` share the root layout but have distinct sub-layouts. The dashboard layout includes the sidebar navigation and auth guards.

Components live in `src/components/`. Utility functions live in `src/lib/`.

### TypeScript Conventions

- All code is TypeScript. No `.js` files.
- Strict mode enabled.
- Zod schemas are used for all API input validation and AI output validation.
- Prefer named exports over default exports.

### Validation Pattern

Input validation uses Zod at the API boundary:

```typescript
// schemas.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  businessName: z.string().optional(),
});

// handlers.ts
const body = registerSchema.parse(request.body);
// If validation fails, Zod throws and Fastify returns 400
```

## Adding New Features

### Adding a new API module

1. Create a directory under `apps/api/src/modules/`:
   ```
   modules/
     your-module/
       routes.ts
       handlers.ts
       schemas.ts
       service.ts
   ```

2. Define Zod schemas for request/response in `schemas.ts`.

3. Implement business logic in `service.ts`.

4. Write handlers in `handlers.ts` that validate input and call services.

5. Register routes in `routes.ts`.

6. Register the module in `apps/api/src/app.ts`:
   ```typescript
   import { yourModuleRoutes } from './modules/your-module/routes';
   app.register(yourModuleRoutes, { prefix: '/api/your-module' });
   ```

7. Add tests in `apps/api/tests/`.

### Adding a new frontend page

1. Create a directory under the appropriate route group:
   - Public pages: `apps/web/src/app/(marketing)/your-page/page.tsx`
   - Dashboard pages: `apps/web/src/app/(dashboard)/dashboard/your-page/page.tsx`

2. The file must export a default React component.

3. Shared components go in `apps/web/src/components/`.

### Database schema changes

1. Edit `apps/api/prisma/schema.prisma`.

2. Create and apply the migration:
   ```bash
   cd apps/api
   npx prisma migrate dev --name describe_change
   ```

3. The Prisma client is regenerated automatically.

4. Update `docs/db-schema.sql` if you maintain the raw SQL reference.

## Environment Variables Reference

### API (`apps/api/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | Secret for signing refresh tokens |
| `PORT` | No | `5004` | API server port |
| `NODE_ENV` | No | `development` | Environment: `development`, `test`, `production` |
| `ANTHROPIC_API_KEY` | No | - | Claude API key (required for AI generation) |
| `STRIPE_SECRET_KEY` | No | - | Stripe API secret key (required for payments) |
| `STRIPE_WEBHOOK_SECRET` | No | - | Stripe webhook signing secret |

### Test (`apps/api/.env.test`)

Uses the same variables as `.env` but points to the test database:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/invoiceforge_test
```

## Docker

### Development with Docker

```bash
# Start PostgreSQL only
docker compose up -d db

# Start everything (API + PostgreSQL)
docker compose up -d

# View logs
docker compose logs -f api

# Stop everything
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

The `docker-compose.yml` includes health checks -- the API container waits for PostgreSQL to be ready before starting.

### Building the API container

```bash
docker build -t invoiceforge-api -f Dockerfile .
```

The Dockerfile uses a multi-stage build: dependencies, build (TypeScript compile + Prisma generate), and production (minimal image).

## Ports

| Service | Port | Notes |
|---------|------|-------|
| Frontend (Next.js) | 3109 | `apps/web` dev server |
| Backend API (Fastify) | 5004 | `apps/api` dev server |
| PostgreSQL | 5432 | Shared database instance |
| Prisma Studio | 5555 | Visual DB browser (when running) |

These ports are assigned in the ConnectSW port registry. Do not change them without updating `.claude/PORT-REGISTRY.md`.
