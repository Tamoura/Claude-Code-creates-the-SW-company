# ITIL Dashboard

Full-stack ITIL Service Management Dashboard built with Next.js 14, Fastify, Prisma, and PostgreSQL.

## Product Overview

The ITIL Dashboard is a comprehensive service management platform implementing ITIL (Information Technology Infrastructure Library) best practices for:

- **Incident Management** - Track and resolve service disruptions ✅
- **Problem Management** - Identify and fix root causes (Coming Soon)
- **Change Management** - Control IT environment changes (Coming Soon)
- **Service Request Management** - Handle service requests and catalog (Coming Soon)
- **Knowledge Management** - Build organizational knowledge base (Coming Soon)

**Current Status**: Foundation Phase Complete ✅

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start PostgreSQL
```bash
pnpm docker:up
```

### 3. Set Up Database
```bash
pnpm db:migrate
pnpm db:seed
```

### 4. Start Development
```bash
pnpm dev
```

### 5. Access
- **Frontend**: http://localhost:3107
- **API**: http://localhost:5002
- **Login**: admin@itil.dev / Admin123!

## Tech Stack

- **Backend**: Fastify + Prisma + PostgreSQL (:5002)
- **Frontend**: Next.js 14 + React 18 + Tailwind (:3107)
- **Database**: PostgreSQL 15 (:5432)
- **Testing**: Vitest + Playwright

## Documentation

See [full documentation](../../README.md) for:
- Detailed setup instructions
- API endpoints
- Database schema
- Testing guidelines
- Production deployment

## Architecture

See [docs/architecture.md](docs/architecture.md) for system architecture and design decisions.
