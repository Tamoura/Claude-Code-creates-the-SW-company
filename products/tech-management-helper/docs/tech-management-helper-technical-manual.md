# Tech Management Helper - Technical Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: Tech Management Helper

---

## Architecture Overview

Tech Management Helper is a full-stack GRC platform with frontend (Next.js), backend API (Fastify), and database (PostgreSQL).

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Clients (Browsers)                     │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Frontend (Next.js 14 + React 18)            │
│  - SSR for SEO                                          │
│  - CSR for dashboard                                    │
│  - shadcn/ui components                                 │
│  - React Query for state                                │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Fastify + TypeScript)          │
│  - REST endpoints                                       │
│  - JWT authentication                                   │
│  - CASL authorization                                   │
│  - Audit logging                                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Database (PostgreSQL 15 + Prisma)           │
│  - users, risks, controls, assets                       │
│  - assessments, frameworks, audit_logs                  │
│  - 7-year retention for audit logs                      │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | SSR/CSR hybrid, React 18 features |
| UI | shadcn/ui + Radix | Accessible component primitives |
| Backend | Fastify | Fast, TypeScript-first API |
| Database | PostgreSQL 15 | ACID compliance, JSON support |
| ORM | Prisma | Type-safe database access |
| Auth | NextAuth.js | OAuth + JWT authentication |
| Authorization | CASL | Role-based access control |
| State | React Query | Server state management |
| Charts | Recharts | Data visualization |
| Forms | React Hook Form + Zod | Form handling & validation |
| Hosting | Vercel (Web) + Render (API) | Deployment platforms |

---

## Database Schema

### Core Tables

**users**
- id (UUID), email, name, role (Admin, Manager, Analyst, Viewer)
- password_hash, created_at, updated_at

**risks**
- id, title, description, category, likelihood (1-5), impact (1-5)
- status, owner_id, created_at, updated_at

**controls**
- id, code, title, description, category, status
- owner_id, created_at, updated_at

**assets**
- id, name, type, criticality, owner_id, metadata (JSONB)
- created_at, updated_at

**assessments**
- id, control_id, assessor_id, rating (1-5)
- findings, recommendations, status (draft, submitted, approved, rejected)
- assessed_at, approved_by, approved_at

**frameworks**
- id, name (NIST CSF, ISO 27001, COBIT, IT4IT), version
- categories (JSONB), created_at

**control_framework_mappings**
- control_id, framework_id, reference_id (e.g., PR.AC-1)

**audit_logs**
- id, user_id, action, entity_type, entity_id
- old_value (JSONB), new_value (JSONB), timestamp
- Partitioned by year for 7-year retention

---

## API Design

### Authentication

**Login**
```
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "token": "jwt_token_here",
  "user": { "id", "email", "name", "role" }
}
```

**JWT Token**: Signed with HS256, expires in 24 hours

### Risk Management

**List Risks**
```
GET /api/v1/risks?page=1&limit=50&status=open

Response:
{
  "data": [{ "id", "title", "likelihood", "impact", "status" }],
  "meta": { "total", "page", "limit" }
}
```

**Create Risk**
```
POST /api/v1/risks
{
  "title": "Data breach via phishing",
  "description": "...",
  "category": "security",
  "likelihood": 4,
  "impact": 5,
  "status": "identified",
  "owner_id": "user_uuid"
}

Response: 201 Created
{ "id", "title", ... }
```

### Control Management

**Create Control**
```
POST /api/v1/controls
{
  "code": "AC-01",
  "title": "Access Control Policy",
  "description": "...",
  "category": "access_control",
  "status": "implemented",
  "owner_id": "user_uuid"
}
```

**Map to Framework**
```
POST /api/v1/controls/:id/frameworks
{
  "framework_id": "nist_csf",
  "reference": "PR.AC-1"
}
```

### Authorization (CASL)

```typescript
// Ability definitions
export function defineAbilityFor(user: User) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  if (user.role === 'Admin') {
    can('manage', 'all');
  } else if (user.role === 'Manager') {
    can(['create', 'read', 'update', 'delete'], ['Risk', 'Control', 'Asset']);
    can('approve', 'Assessment');
  } else if (user.role === 'Analyst') {
    can('read', 'all');
    can(['create', 'update'], ['Risk', 'Control', 'Asset', 'Assessment']);
    cannot('delete', 'all');
  } else if (user.role === 'Viewer') {
    can('read', 'all');
  }

  return build();
}
```

---

## Deployment

### Infrastructure

**Frontend**: Vercel (automatic deployments from GitHub)
**Backend**: Render (Web Service with auto-deploy)
**Database**: Render PostgreSQL (managed, automatic backups)

### Environment Variables

**Frontend** (.env.local)
```
NEXT_PUBLIC_API_URL=https://api.techmanagement.com
NEXTAUTH_SECRET=random_secret_here
NEXTAUTH_URL=https://techmanagement.com
```

**Backend** (.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=secret_key_here
NODE_ENV=production
PORT=5001
```

### CI/CD Pipeline

1. **Push to main** → Triggers GitHub Actions
2. **Run Tests** → Vitest (unit) + Playwright (E2E)
3. **Build** → Next.js build + API build
4. **Deploy** → Vercel (frontend) + Render (backend)
5. **Migrate** → Prisma migrate deploy
6. **Health Check** → Verify endpoints

---

## Performance Optimization

### Database Indexing

```sql
CREATE INDEX idx_risks_owner ON risks(owner_id);
CREATE INDEX idx_controls_status ON controls(status);
CREATE INDEX idx_assessments_control ON assessments(control_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### Caching Strategy

- **React Query**: Cache API responses (5-minute stale time)
- **Database**: Read replicas for analytics queries
- **CDN**: Static assets cached at edge

### Pagination

All list endpoints support pagination:
- Default: 50 items per page
- Maximum: 100 items per page
- Cursor-based for large datasets

---

## Security

### Authentication & Authorization

- **Passwords**: Hashed with bcrypt (cost factor 12)
- **JWTs**: Signed, 24-hour expiry
- **RBAC**: Enforced on all API endpoints
- **Session Management**: HTTP-only cookies, SameSite strict

### Data Protection

- **At Rest**: PostgreSQL encryption (AES-256)
- **In Transit**: TLS 1.3
- **Secrets**: Environment variables, never in code
- **Audit Logs**: Immutable, 7-year retention

### Attack Prevention

- **SQL Injection**: Prisma ORM (parameterized queries)
- **XSS**: React auto-escaping, CSP headers
- **CSRF**: SameSite cookies, CSRF tokens
- **Rate Limiting**: 100 requests/minute per user

---

## Testing

### Unit Tests (Vitest)

```typescript
// Example: Risk calculation
import { calculateRiskScore } from './risk';

describe('calculateRiskScore', () => {
  it('calculates score as likelihood × impact', () => {
    expect(calculateRiskScore(4, 5)).toBe(20);
  });
});
```

### Integration Tests

```typescript
// Example: API endpoint
import { test, expect } from '@playwright/test';

test('create risk via API', async ({ request }) => {
  const response = await request.post('/api/v1/risks', {
    data: { title: 'Test Risk', likelihood: 3, impact: 4 }
  });
  
  expect(response.status()).toBe(201);
});
```

### E2E Tests (Playwright)

```typescript
test('complete risk management flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('text=Log In');
  
  await page.goto('/risks');
  await page.click('text=Add Risk');
  // ... fill form ...
  await page.click('text=Save');
  
  await expect(page.locator('text=Risk created')).toBeVisible();
});
```

---

## Development Guide

### Setup

```bash
# Clone repository
git clone https://github.com/connectsw/tech-management-helper.git

# Install dependencies
npm install  # Root (installs workspaces)

# Setup database
cd apps/api
npx prisma migrate dev
npx prisma db seed

# Start development
npm run dev  # Starts frontend (3100) + backend (5001)
```

### Database Migrations

```bash
# Create migration
cd apps/api
npx prisma migrate dev --name add_frameworks_table

# Apply to production
npx prisma migrate deploy
```

### Adding a New Feature

1. **Define Requirements** → PRD/User Story
2. **Write Tests** → TDD approach
3. **Implement Backend** → API endpoints + database
4. **Implement Frontend** → Pages + components
5. **Test E2E** → Full user flow
6. **Deploy** → PR → Staging → Production

---

## Monitoring & Observability

### Logging

- **Structured Logs**: JSON format
- **Levels**: error, warn, info, debug
- **Retention**: 90 days (hot), 2 years (archive)

### Metrics

- **API Latency**: p50, p95, p99
- **Error Rate**: 5xx responses
- **Database**: Query time, connection pool
- **User Activity**: Logins, actions per role

### Alerts

**Critical**:
- API downtime > 5 minutes
- Database connection failure
- Error rate > 5%

**Warning**:
- API latency > 1s (p95)
- Database queries > 500ms
- Disk usage > 80%

---

**End of Technical Manual**
