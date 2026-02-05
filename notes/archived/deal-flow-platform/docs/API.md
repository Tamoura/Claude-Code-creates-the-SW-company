# DealGate API -- v1 Route Outline

**Base URL**: `http://localhost:5003/api/v1`
**Format**: JSON
**Authentication**: JWT Bearer token (unless noted as public)

---

## Authentication

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | Public | Register new user (investor or issuer) |
| POST | `/auth/login` | Public | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh token | Rotate refresh token, get new access token |
| POST | `/auth/logout` | Bearer | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public (token) | Reset password with token |

---

## Deals

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/deals` | Public | List/search deals (paginated, filterable) |
| GET | `/deals/:id` | Public | Get deal detail |
| POST | `/deals` | Issuer | Create new deal (draft) |
| PATCH | `/deals/:id` | Issuer (owner) | Update deal |
| PATCH | `/deals/:id/status` | Issuer (owner) | Transition deal status |
| GET | `/deals/:id/documents` | Bearer | List deal documents |
| POST | `/deals/:id/documents` | Issuer (owner) | Upload deal document |
| DELETE | `/deals/:id/documents/:docId` | Issuer (owner) | Remove document |
| GET | `/deals/:id/analytics` | Issuer (owner) | Deal demand analytics |

### Deal Query Parameters

```
GET /deals?dealType=SUKUK&sector=BANKING&shariaCompliant=true
           &minInvestment=1000&maxInvestment=100000
           &status=ACTIVE&eligibility=RETAIL
           &search=qiib&sort=createdAt&order=desc
           &limit=20&cursor=abc123
```

---

## Subscriptions

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/subscriptions` | Investor | Create subscription intent |
| GET | `/subscriptions` | Bearer | List user's subscriptions |
| GET | `/subscriptions/:id` | Bearer | Get subscription detail |
| PATCH | `/subscriptions/:id/status` | Issuer | Approve/reject subscription |
| POST | `/subscriptions/:id/allocate` | Issuer | Set allocation amount |

### Subscription Request Body

```json
{
  "dealId": "clx123...",
  "amount": 50000.00,
  "currency": "QAR",
  "acceptedTerms": true,
  "acceptedRisks": true
}
```

---

## Investors

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/investors/profile` | Investor | Get own investor profile |
| PUT | `/investors/profile` | Investor | Update investor profile |
| GET | `/investors/classification` | Investor | Get classification status |
| POST | `/investors/classification` | Investor | Submit classification data |
| GET | `/investors/portfolio` | Investor | Get portfolio summary |
| GET | `/investors/portfolio/items` | Investor | List portfolio items |

---

## Issuers

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/issuers/profile` | Issuer | Get own issuer profile |
| PUT | `/issuers/profile` | Issuer | Update issuer profile |
| GET | `/issuers/deals` | Issuer | List own deals |
| GET | `/issuers/analytics` | Issuer | Aggregate analytics dashboard |
| GET | `/issuers/subscribers` | Issuer | List subscribers across deals |

---

## Watchlist

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/watchlist` | Investor | List watchlisted deals |
| POST | `/watchlist` | Investor | Add deal to watchlist |
| DELETE | `/watchlist/:dealId` | Investor | Remove deal from watchlist |

---

## Notifications

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/notifications` | Bearer | List notifications (paginated) |
| PATCH | `/notifications/:id/read` | Bearer | Mark notification as read |
| PATCH | `/notifications/read-all` | Bearer | Mark all as read |
| GET | `/notifications/preferences` | Bearer | Get notification preferences |
| PUT | `/notifications/preferences` | Bearer | Update preferences |

---

## Admin / Tenant

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/admin/tenants` | Super Admin | List all tenants |
| POST | `/admin/tenants` | Super Admin | Create new tenant |
| PATCH | `/admin/tenants/:id` | Super Admin | Update tenant config |
| GET | `/admin/tenants/:id/branding` | Tenant Admin | Get tenant branding |
| PUT | `/admin/tenants/:id/branding` | Tenant Admin | Update branding |
| GET | `/admin/users` | Tenant Admin | List users in tenant |
| PATCH | `/admin/users/:id/role` | Tenant Admin | Update user role |
| GET | `/admin/audit-log` | Tenant Admin | Query audit log |

---

## Integration / Webhooks

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/integrations` | Tenant Admin | List configured integrations |
| POST | `/integrations` | Tenant Admin | Configure an integration |
| PATCH | `/integrations/:id` | Tenant Admin | Update integration config |
| DELETE | `/integrations/:id` | Tenant Admin | Remove integration |
| POST | `/integrations/:id/test` | Tenant Admin | Test integration connection |
| GET | `/webhooks` | Tenant Admin | List webhook endpoints |
| POST | `/webhooks` | Tenant Admin | Register webhook endpoint |
| PATCH | `/webhooks/:id` | Tenant Admin | Update webhook endpoint |
| DELETE | `/webhooks/:id` | Tenant Admin | Remove webhook endpoint |
| POST | `/webhooks/incoming/:source` | System | Receive inbound webhooks |

---

## Health

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | Public | Basic health check |
| GET | `/health/ready` | Public | Readiness (DB + Redis connected) |

---

## Common Response Formats

### Success (single resource)
```json
{
  "data": { "id": "clx123...", "name": "..." }
}
```

### Success (list)
```json
{
  "data": [{ "id": "clx123..." }, { "id": "clx456..." }],
  "meta": {
    "total": 42,
    "limit": 20,
    "nextCursor": "clx456..."
  }
}
```

### Error (RFC 7807 inspired)
```json
{
  "error": "DEAL_NOT_FOUND",
  "message": "Deal with ID clx999 not found",
  "statusCode": 404
}
```

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| Auth endpoints | 10 req/min per IP |
| Read endpoints | 100 req/min per user |
| Write endpoints | 30 req/min per user |
| Global per tenant | 1000 req/min |
