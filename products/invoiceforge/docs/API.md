# InvoiceForge API Documentation

**Base URL**: `http://localhost:5004/api` (development) | `https://api.invoiceforge.app/api` (production)

**Authentication**: JWT Bearer token in the `Authorization` header.

```
Authorization: Bearer <access_token>
```

---

## Health

### GET /health

Health check endpoint. Returns service status.

**Authentication**: No

**Response** `200 OK`:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "database": "connected"
}
```

---

## Auth

### POST /auth/register

Register a new user account.

**Authentication**: No

**Request body**:
```json
{
  "email": "maya@example.com",
  "password": "SecurePass1",
  "name": "Maya Chen",
  "businessName": "Maya Chen Design"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 number |
| `name` | string | Yes | Min 1 character |
| `businessName` | string | No | Displayed on invoices |

**Response** `201 Created`:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "maya@example.com",
    "name": "Maya Chen"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Validation error (missing fields, weak password) |
| `409` | Email already registered |

---

### POST /auth/login

Log in with email and password.

**Authentication**: No

**Request body**:
```json
{
  "email": "maya@example.com",
  "password": "SecurePass1"
}
```

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Response** `200 OK`:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "maya@example.com",
    "name": "Maya Chen"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `401` | Invalid credentials |

---

### POST /auth/refresh

Refresh an expired access token.

**Authentication**: No

**Request body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | Yes |

**Response** `200 OK`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `401` | Invalid or expired refresh token |

---

### POST /auth/google

Authenticate with a Google OAuth ID token.

**Authentication**: No

**Request body**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

| Field | Type | Required |
|-------|------|----------|
| `idToken` | string | Yes |

**Response** `200 OK`:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "maya@gmail.com",
    "name": "Maya Chen"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `401` | Invalid Google token |

---

### POST /auth/logout

Log out and invalidate the current session.

**Authentication**: Yes

**Response** `204 No Content`

**Errors**:
| Status | Description |
|--------|-------------|
| `401` | Missing or invalid auth token |

---

### POST /auth/forgot-password

Request a password reset email. Always returns 200 (does not reveal whether the email exists).

**Authentication**: No

**Request body**:
```json
{
  "email": "maya@example.com"
}
```

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

**Response** `200 OK`:
```json
{
  "message": "If this email is registered, a reset link has been sent."
}
```

---

### POST /auth/reset-password

Reset password using a token from the reset email.

**Authentication**: No

**Request body**:
```json
{
  "token": "abc123def456...",
  "password": "NewSecurePass1"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | Yes | From the reset email link |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 number |

**Response** `200 OK`:
```json
{
  "message": "Password reset successful."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Invalid or expired token |

---

## Invoices

### POST /invoices/generate

Generate an invoice from a natural language description. This is the core AI endpoint.

**Authentication**: Yes

**Rate limit**: 60 requests/minute per user

**Request body**:
```json
{
  "prompt": "Built React dashboard for Acme Corp, 120 hours at $150/hr. Hosting setup, $500 flat. Apply 8.5% tax. Net 30.",
  "clientId": "660e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `prompt` | string | Yes | 10-2000 characters. Natural language work description. |
| `clientId` | string (uuid) | No | Pre-select a saved client. If omitted, AI attempts auto-match. |

**Response** `201 Created`:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "invoiceNumber": "INV-0003",
  "status": "draft",
  "client": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "email": "billing@acmecorp.com",
    "address": "123 Main St, San Francisco, CA 94105",
    "matched": true
  },
  "items": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "description": "React dashboard development",
      "quantity": 120,
      "unitPrice": 15000,
      "amount": 1800000,
      "sortOrder": 0
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "description": "Hosting setup",
      "quantity": 1,
      "unitPrice": 50000,
      "amount": 50000,
      "sortOrder": 1
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
  "aiPrompt": "Built React dashboard for Acme Corp, 120 hours at $150/hr...",
  "shareToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "paymentLink": null,
  "paidAt": null,
  "sentAt": null,
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-01T10:00:00.000Z"
}
```

**Money format**: All monetary values are in **cents** (integers). `1850000` = $18,500.00. Tax rates are in **basis points**: `850` = 8.50%.

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Input too ambiguous or missing billable items |
| `402` | Monthly invoice limit reached (free tier, 5/month) |
| `503` | AI service unavailable |

**Error example** (`400`):
```json
{
  "error": "We need more detail. Please include a client name and at least one billable item with an amount.",
  "missingFields": ["clientName", "lineItems"]
}
```

---

### GET /invoices

List invoices for the authenticated user with filtering, search, and pagination.

**Authentication**: Yes

**Query parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter: `draft`, `sent`, `paid`, `overdue` |
| `search` | string | - | Search by client name or invoice number |
| `page` | integer | 1 | Page number (min 1) |
| `limit` | integer | 25 | Results per page (1-100) |
| `sortBy` | string | `createdAt` | Sort field: `createdAt`, `dueDate`, `total` |
| `sortOrder` | string | `desc` | Sort direction: `asc`, `desc` |

**Response** `200 OK`:
```json
{
  "invoices": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "invoiceNumber": "INV-0003",
      "status": "sent",
      "client": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corp",
        "email": "billing@acmecorp.com",
        "address": null,
        "matched": true
      },
      "items": [],
      "subtotal": 1850000,
      "taxRate": 850,
      "taxAmount": 157250,
      "total": 2007250,
      "currency": "USD",
      "invoiceDate": "2026-02-01",
      "dueDate": "2026-03-03",
      "notes": null,
      "aiPrompt": null,
      "shareToken": "a1b2c3d4-...",
      "paymentLink": null,
      "paidAt": null,
      "sentAt": "2026-02-01T12:00:00.000Z",
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "totalPages": 2
  },
  "summary": {
    "totalOutstanding": 5200000,
    "totalPaidThisMonth": 3500000,
    "invoicesCreatedThisMonth": 8
  }
}
```

---

### GET /invoices/:id

Get a single invoice with all line items.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

**Response** `200 OK`: Full invoice object (same schema as the generate response above).

**Errors**:
| Status | Description |
|--------|-------------|
| `401` | Missing or invalid auth token |
| `404` | Invoice not found or does not belong to user |

---

### PUT /invoices/:id

Update an invoice. Totals are recalculated server-side. Only `draft` invoices can have items modified.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

**Request body** (all fields optional):
```json
{
  "clientId": "660e8400-e29b-41d4-a716-446655440000",
  "invoiceDate": "2026-02-01",
  "dueDate": "2026-03-15",
  "taxRate": 1000,
  "notes": "Thank you for your business!",
  "items": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "description": "React dashboard development",
      "quantity": 120,
      "unitPrice": 15000
    },
    {
      "description": "Code review and QA",
      "quantity": 20,
      "unitPrice": 15000
    }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `clientId` | uuid or null | Link to a saved client |
| `invoiceDate` | date (YYYY-MM-DD) | Invoice issue date |
| `dueDate` | date (YYYY-MM-DD) | Payment due date |
| `taxRate` | integer | Basis points (1000 = 10.00%) |
| `notes` | string or null | Freeform notes section |
| `items` | array | Full replacement. Items with `id` are updated. Items without `id` are created. Existing items not in the array are deleted. |

**Response** `200 OK`: Updated invoice object with recalculated totals.

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Validation error |
| `404` | Invoice not found |

---

### DELETE /invoices/:id

Delete an invoice. Only `draft` invoices can be deleted. Sent, paid, and overdue invoices must be archived instead (tax compliance).

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

**Response** `204 No Content`

**Errors**:
| Status | Description |
|--------|-------------|
| `403` | Cannot delete non-draft invoices |
| `404` | Invoice not found |

---

### POST /invoices/:id/send

Mark an invoice as sent and generate a shareable link. This is a one-way transition from `draft` to `sent`.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

**Response** `200 OK`:
```json
{
  "status": "sent",
  "shareableLink": "https://app.invoiceforge.com/invoice/a1b2c3d4-e5f6-7890-abcd-ef1234567890/view"
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Invoice already sent or paid |
| `404` | Invoice not found |

---

### GET /invoices/:id/pdf

Download the invoice as a PDF file.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

**Response** `200 OK`:
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="INV-0003-acme-corp.pdf"`
- Body: Binary PDF data

**Errors**:
| Status | Description |
|--------|-------------|
| `404` | Invoice not found |

---

### POST /invoices/:id/payment-link

Create a Stripe payment link for the invoice. Requires the user to have connected their Stripe account.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Invoice ID |

**Response** `200 OK`:
```json
{
  "paymentLink": "https://checkout.stripe.com/pay/cs_live_abc123...",
  "stripeSessionId": "cs_live_abc123..."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Stripe account not connected |
| `404` | Invoice not found |

---

### GET /invoices/public/:token

Get an invoice for public viewing. No authentication required. Uses the share token (UUID), not the invoice ID.

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | uuid | Share token (from the shareable link) |

**Response** `200 OK`:
```json
{
  "invoiceNumber": "INV-0003",
  "status": "sent",
  "fromBusinessName": "Maya Chen Design",
  "fromName": "Maya Chen",
  "client": {
    "id": null,
    "name": "Acme Corp",
    "email": "billing@acmecorp.com",
    "address": "123 Main St, San Francisco, CA 94105",
    "matched": false
  },
  "items": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "description": "React dashboard development",
      "quantity": 120,
      "unitPrice": 15000,
      "amount": 1800000,
      "sortOrder": 0
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
  "paymentLink": "https://checkout.stripe.com/pay/cs_live_abc123..."
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `404` | Invoice not found or share token invalid |

---

## Clients

### GET /clients

List saved clients with search and pagination.

**Authentication**: Yes

**Query parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Search by company name or contact name |
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Results per page (max 100) |

**Response** `200 OK`:
```json
{
  "clients": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corp",
      "email": "billing@acmecorp.com",
      "address": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94105",
      "country": "US",
      "phone": "+1-555-0100",
      "notes": "Net 30 preferred",
      "createdAt": "2026-01-15T08:00:00.000Z",
      "updatedAt": "2026-01-20T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

---

### POST /clients

Create a new client.

**Authentication**: Yes

**Request body**:
```json
{
  "name": "Acme Corp",
  "email": "billing@acmecorp.com",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94105",
  "country": "US",
  "phone": "+1-555-0100",
  "notes": "Net 30 preferred"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Company or individual name |
| `email` | string | No | Contact email |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `state` | string | No | State/province |
| `zip` | string | No | Postal code |
| `country` | string | No | Country (defaults to "US") |
| `phone` | string | No | Phone number |
| `notes` | string | No | Internal notes |

**Response** `201 Created`: Client object.

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Validation error (name required) |

---

### GET /clients/:id

Get a client with their invoice history.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Client ID |

**Response** `200 OK`:
```json
{
  "client": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "email": "billing@acmecorp.com",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US",
    "phone": "+1-555-0100",
    "notes": "Net 30 preferred",
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-20T14:30:00.000Z"
  },
  "invoices": [
    {
      "id": "770e8400-...",
      "invoiceNumber": "INV-0003",
      "status": "paid",
      "total": 2007250,
      "invoiceDate": "2026-02-01",
      "dueDate": "2026-03-03"
    }
  ]
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `404` | Client not found |

---

### PUT /clients/:id

Update client details.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Client ID |

**Request body** (all fields optional):
```json
{
  "name": "Acme Corporation",
  "email": "ap@acmecorp.com",
  "phone": "+1-555-0200"
}
```

**Response** `200 OK`: Updated client object.

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Validation error |
| `404` | Client not found |

---

### DELETE /clients/:id

Delete a client. Invoices linked to this client are preserved but the client reference is set to null.

**Authentication**: Yes

**Path parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Client ID |

**Response** `204 No Content`

**Errors**:
| Status | Description |
|--------|-------------|
| `404` | Client not found |

---

## Users

### GET /users/me

Get the current authenticated user's profile.

**Authentication**: Yes

**Response** `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "maya@example.com",
  "name": "Maya Chen",
  "businessName": "Maya Chen Design",
  "subscriptionTier": "free",
  "invoiceCountThisMonth": 3,
  "invoiceLimitThisMonth": 5,
  "stripeConnected": false,
  "createdAt": "2026-01-10T08:00:00.000Z"
}
```

---

### PUT /users/me

Update the current user's profile.

**Authentication**: Yes

**Request body** (all fields optional):
```json
{
  "name": "Maya L. Chen",
  "businessName": "Chen Digital Studio"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Min 1 character |
| `businessName` | string | Displayed on invoices |

**Response** `200 OK`: Updated user profile object.

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Validation error |

---

### GET /users/me/subscription

Get subscription details and current usage.

**Authentication**: Yes

**Response** `200 OK`:
```json
{
  "tier": "free",
  "invoicesUsedThisMonth": 3,
  "invoicesRemainingThisMonth": 2,
  "resetDate": "2026-03-01T00:00:00.000Z",
  "stripeCustomerId": null,
  "stripeSubscriptionId": null
}
```

For Pro/Team tiers, `invoicesRemainingThisMonth` is `null` (unlimited).

---

## Webhooks

### POST /webhooks/stripe

Receives Stripe events. Authenticated via Stripe webhook signature verification, not JWT.

**Authentication**: Stripe signature (`Stripe-Signature` header)

Handled event types:
- `checkout.session.completed` -- marks invoice as paid
- `customer.subscription.updated` -- updates subscription tier
- `customer.subscription.deleted` -- reverts to free tier

**Request**: Raw Stripe event body (do not parse before signature verification).

**Response** `200 OK`:
```json
{
  "received": true
}
```

**Errors**:
| Status | Description |
|--------|-------------|
| `400` | Invalid webhook signature |

---

## Common Patterns

### Money Format

All monetary values are **integers representing cents**:
- `15000` = $150.00
- `1850000` = $18,500.00

Tax rates are **integers representing basis points**:
- `850` = 8.50%
- `1000` = 10.00%

### Pagination

Paginated endpoints return:
```json
{
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "totalPages": 2
  }
}
```

### Error Responses

Validation errors follow this format:
```json
{
  "error": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 10-20 requests/minute |
| AI generation (`/invoices/generate`) | 60 requests/minute |
| All other endpoints | 200 requests/minute |

### Authentication Flow

1. Register or login to receive `accessToken` (1hr) and `refreshToken` (7d).
2. Include `accessToken` in the `Authorization: Bearer <token>` header.
3. When the access token expires, call `POST /auth/refresh` with the refresh token.
4. On logout, call `POST /auth/logout` to invalidate the session.
