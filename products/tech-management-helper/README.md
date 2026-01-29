# Tech Management Helper

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 28, 2026

A GRC (Governance, Risk, and Compliance) platform designed specifically for Technology Managers in regulated industries.

---

## Overview

Tech Management Helper provides a unified view of compliance status across multiple frameworks (NIST CSF, ISO 27001, COBIT, IT4IT), risk management with visual scoring, control tracking, and asset inventory management.

### Key Features (v1.0.0)

- **Authentication System**
  - JWT-based authentication
  - Role-based access control (Admin, Manager, Analyst, Viewer)
  - Secure session management
  - 7-year audit logging

- **Risk Management**
  - Risk register with CRUD operations
  - Likelihood × Impact scoring (5×5 matrix)
  - Risk categories and status tracking
  - Risk-Control linking
  - Risk-Asset linking
  - Comprehensive audit trail

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Fastify, Node.js 20+, TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Testing**: Vitest (86 backend tests passing)

---

## Quick Start

### Deploy to Production (Recommended)

**Time**: 30-45 minutes

```bash
# See the quick reference card
cat DEPLOY_NOW.md

# Or follow the step-by-step guide
open docs/QUICKSTART_DEPLOYMENT.md
```

### Run Locally for Testing

**Time**: 15 minutes

```bash
# Prerequisites: Docker installed

# 1. Start database
docker run --name tech-mgmt-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tech_management_helper \
  -p 5432:5432 -d postgres:15

# 2. Configure and start API
cd apps/api
cp .env.example .env
npm install
npm run db:migrate
npm run dev

# 3. Configure and start frontend (new terminal)
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev

# 4. Create admin user
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!@#",
    "fullName": "Admin User",
    "role": "ADMIN"
  }'

# 5. Open browser
open http://localhost:3100
```

---

## Documentation

### Deployment
- **[DEPLOY_NOW.md](DEPLOY_NOW.md)** - Quick reference card (start here!)
- **[docs/QUICKSTART_DEPLOYMENT.md](docs/QUICKSTART_DEPLOYMENT.md)** - 30-minute cloud deployment guide
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Comprehensive deployment reference
- **[docs/DEPLOYMENT_EXECUTION_PLAN.md](docs/DEPLOYMENT_EXECUTION_PLAN.md)** - Detailed execution plan

### Product Information
- **[docs/PRD.md](docs/PRD.md)** - Product Requirements Document
- **[docs/RELEASE_NOTES_v1.0.0.md](docs/RELEASE_NOTES_v1.0.0.md)** - Release notes for v1.0.0
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

### Technical Documentation
- **[docs/architecture.md](docs/architecture.md)** - System architecture
- **[docs/data-model.md](docs/data-model.md)** - Database schema
- **[docs/api-contract.yml](docs/api-contract.yml)** - OpenAPI specification
- **[docs/ADRs/](docs/ADRs/)** - Architecture Decision Records

---

## Project Structure

```
tech-management-helper/
├── apps/
│   ├── api/                  # Fastify backend API
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── services/     # Business logic
│   │   │   ├── middleware/   # Auth, error handling
│   │   │   └── types/        # TypeScript definitions
│   │   ├── prisma/           # Database schema and migrations
│   │   └── tests/            # Backend tests (86 tests)
│   │
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/          # Next.js 14 App Router
│       │   ├── components/   # React components
│       │   ├── lib/          # API client, utilities
│       │   └── types/        # TypeScript definitions
│       └── tests/            # Frontend tests
│
├── docs/                     # Documentation
├── e2e/                      # End-to-end tests (future)
└── packages/                 # Shared packages (future)
```

---

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/Tamoura/Claude-Code-creates-the-SW-company.git
cd products/tech-management-helper

# Install dependencies
cd apps/api && npm install
cd ../web && npm install

# Set up database
cd apps/api
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run db:migrate

# Run development servers
npm run dev  # In both apps/api and apps/web
```

### Testing

```bash
# Backend tests
cd apps/api
npm test                 # Run all tests
npm run test:watch      # Watch mode

# Frontend tests
cd apps/web
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

### Database Operations

```bash
cd apps/api

# Generate Prisma Client
npm run db:generate

# Create migration
npm run db:migrate

# Push schema to database (dev only)
npm run db:push

# Open Prisma Studio (GUI)
npm run db:studio

# Seed database
npm run db:seed
```

---

## API Reference

### Base URL
- Local: `http://localhost:5001`
- Production: `https://your-api.onrender.com`

### Authentication Endpoints

```bash
# Register user
POST /api/v1/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "User Name",
  "role": "ADMIN"
}

# Login
POST /api/v1/auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Get current user
GET /api/v1/auth/me
Authorization: Bearer <token>

# Logout
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### Risk Endpoints

```bash
# List risks
GET /api/v1/risks
Authorization: Bearer <token>

# Create risk
POST /api/v1/risks
Authorization: Bearer <token>
Content-Type: application/json
{
  "title": "Risk Title",
  "description": "Risk description",
  "category": "Technology",
  "likelihood": 3,
  "impact": 4,
  "status": "IDENTIFIED"
}

# Get risk by ID
GET /api/v1/risks/:id
Authorization: Bearer <token>

# Update risk
PUT /api/v1/risks/:id
Authorization: Bearer <token>
Content-Type: application/json
{
  "title": "Updated Title",
  "status": "MITIGATED"
}

# Delete risk
DELETE /api/v1/risks/:id
Authorization: Bearer <token>

# Link risk to control
POST /api/v1/risks/:id/controls
Authorization: Bearer <token>
Content-Type: application/json
{
  "controlId": "control-uuid-here"
}

# Link risk to asset
POST /api/v1/risks/:id/assets
Authorization: Bearer <token>
Content-Type: application/json
{
  "assetId": "asset-uuid-here"
}
```

Full API documentation: [docs/api-contract.yml](docs/api-contract.yml)

---

## Environment Variables

### Backend (`apps/api/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/tech_management_helper?schema=public"

# Authentication
JWT_SECRET="your-secure-random-secret-here-min-32-chars"
JWT_EXPIRY=7d

# Server
NODE_ENV=production
PORT=5001
HOST=0.0.0.0

# CORS
CORS_ORIGIN="https://your-frontend-url.com"

# Logging
LOG_LEVEL=info
```

### Frontend (`apps/web/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-url.com

# Environment
NODE_ENV=production
```

---

## Deployment

### Recommended: Vercel + Render

**Cost**: Free tier available, $34/month for production

1. **Database**: Render PostgreSQL
2. **Backend API**: Render Web Service
3. **Frontend**: Vercel

**Time to deploy**: 30-45 minutes

See [docs/QUICKSTART_DEPLOYMENT.md](docs/QUICKSTART_DEPLOYMENT.md) for step-by-step instructions.

### Alternative: Railway

**Cost**: $5/month minimum

All-in-one platform for database, API, and frontend.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Railway instructions.

### Alternative: Local/Self-Hosted

**Cost**: Free (hardware costs only)

Use Docker, nginx, and PM2 for self-hosted deployment.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for self-hosted instructions.

---

## Testing

### Test Coverage (v1.0.0)

- **Backend**: 86/86 tests passing
  - Authentication: 39 tests
  - Risk Management: 47 tests
  - Coverage: ~90%

- **Frontend**: Component tests (future)
- **E2E**: End-to-end tests (future)

### Running Tests

```bash
# Backend unit tests
cd apps/api
npm test

# Frontend unit tests
cd apps/web
npm test

# E2E tests (future)
cd e2e
npm test
```

---

## Security

### Authentication
- JWT tokens with configurable expiry
- Bcrypt password hashing (10 rounds)
- HTTP-only cookies for session management
- CSRF protection via SameSite cookies

### Authorization
- Role-based access control (RBAC)
- Permission enforcement at API layer
- Database-level row security (future)

### Data Protection
- TLS 1.2+ for all connections
- Database encryption at rest
- Audit logging for all changes
- 7-year log retention

### Best Practices
- Strong JWT secret (32+ characters)
- Secure password requirements
- CORS properly configured
- Regular security updates

---

## Monitoring

### Health Check

```bash
# API health endpoint
curl https://your-api-url.com/health

# Expected response
{"status":"ok","timestamp":"2026-01-28T..."}
```

### Recommended Tools

- **Uptime**: UptimeRobot (free)
- **Errors**: Sentry (free tier available)
- **Logs**: Platform built-in (Render, Vercel)
- **Performance**: Vercel Analytics

---

## Roadmap

### v1.1 (Q2 2026)
- User registration UI
- Password reset flow
- Email notifications
- Test parallelization fix

### v1.2 (Q2 2026)
- Asset management UI
- Control management UI
- Control assessment workflow

### v1.3 (Q3 2026)
- Compliance dashboard
- IT4IT value stream visualization
- Framework library

### v2.0 (Q4 2026)
- Multi-organization tenancy
- Advanced analytics
- Automated control testing
- External integrations

---

## Support

### Documentation
- **Deployment**: [docs/QUICKSTART_DEPLOYMENT.md](docs/QUICKSTART_DEPLOYMENT.md)
- **API Reference**: [docs/api-contract.yml](docs/api-contract.yml)
- **Architecture**: [docs/architecture.md](docs/architecture.md)

### Resources
- **GitHub**: https://github.com/Tamoura/Claude-Code-creates-the-SW-company
- **Release**: https://github.com/Tamoura/Claude-Code-creates-the-SW-company/releases/tag/tech-management-helper-v1.0.0
- **Issues**: https://github.com/Tamoura/Claude-Code-creates-the-SW-company/issues

### Platform Documentation
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Prisma**: https://www.prisma.io/docs
- **Next.js**: https://nextjs.org/docs
- **Fastify**: https://www.fastify.io/docs

---

## License

Proprietary - ConnectSW Internal Use Only

---

## Credits

**Product**: ConnectSW Tech Management Helper
**Version**: 1.0.0
**Built By**: Claude Code Agent Team
- Product Manager Agent
- Architect Agent
- Backend Engineer Agent
- Frontend Engineer Agent
- QA Engineer Agent
- DevOps Engineer Agent

**Company**: ConnectSW - AI-First Software Company

---

## Getting Started

1. **Read this README** (you're here!)
2. **Choose deployment path**: [DEPLOY_NOW.md](DEPLOY_NOW.md)
3. **Deploy to production**: [docs/QUICKSTART_DEPLOYMENT.md](docs/QUICKSTART_DEPLOYMENT.md)
4. **Or run locally**: Follow "Run Locally" section above
5. **Create admin user**: Follow guide instructions
6. **Start managing risks**: Login and explore!

**Recommended first step**: Run locally (15 minutes) to test, then deploy to cloud (30 minutes) for production use.

---

**Last Updated**: January 28, 2026
**Status**: Production Ready - v1.0.0
