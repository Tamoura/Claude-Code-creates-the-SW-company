# Mu'aththir API Reference

**Base URL**: `http://localhost:5005/api`

All endpoints are prefixed with `/api`. Request and response bodies use JSON (`Content-Type: application/json`).

For the full OpenAPI specification, see [api-schema.yml](api-schema.yml).

---

## Table of Contents

- [Authentication Flow](#authentication-flow)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [Error Response Format](#error-response-format)
- [Dimensions and Enums](#dimensions-and-enums)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Auth](#auth)
  - [Children](#children)
  - [Observations](#observations)
  - [Goals](#goals)
  - [Goal Templates](#goal-templates)
  - [Milestones](#milestones)
  - [Dashboard](#dashboard)
  - [Insights](#insights)
  - [Reports](#reports)
  - [Profile](#profile)
  - [Sharing](#sharing)
  - [Export](#export)
  - [Photo Upload](#photo-upload)

---

## Authentication Flow

Mu'aththir uses a dual-token authentication strategy:

1. **Access Token** -- Short-lived JWT (1 hour) sent in the `Authorization` header.
2. **Refresh Token** -- Long-lived opaque token (7 days) stored in an HttpOnly cookie.

### How It Works

1. User registers or logs in. The response contains an `accessToken` in the JSON body and a `refreshToken` set as an HttpOnly cookie.
2. For authenticated requests, include the access token: `Authorization: Bearer <accessToken>`.
3. When the access token expires, call `POST /api/auth/refresh`. The refresh token is sent automatically via the cookie. A new access token (and rotated refresh token) are returned.
4. On logout, the server deletes the session and clears the refresh cookie.

### Token Details

| Token | Lifetime | Storage | Transport |
|-------|----------|---------|-----------|
| Access token | 1 hour | Client memory (not localStorage) | `Authorization: Bearer` header |
| Refresh token | 7 days | HttpOnly, Secure, SameSite=Strict cookie | Automatic via cookie on `/api/auth` path |

### CSRF Protection

The refresh token cookie uses `SameSite=Strict`, which prevents the browser from sending it on cross-site requests. This eliminates CSRF attacks against the token refresh endpoint without requiring CSRF tokens. The cookie also has:

- `httpOnly: true` -- inaccessible to JavaScript
- `secure: true` in production -- sent only over HTTPS
- `path: /api/auth` -- scoped to auth endpoints only

### Access Token Payload

The JWT access token contains:

```json
{
  "sub": "parent-uuid",
  "email": "fatima@example.com",
  "tier": "free",
  "iat": 1707300000,
  "exp": 1707303600
}
```

| Claim | Description |
|-------|-------------|
| `sub` | Parent (user) ID |
| `email` | Parent email address |
| `tier` | Subscription tier (`free` or `premium`) |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expiration (Unix timestamp, 1 hour after `iat`) |

---

## Rate Limiting

Global rate limit: **100 requests per minute** per IP address.

Some endpoints have stricter per-route limits:

| Endpoint | Max Requests | Time Window |
|----------|-------------|-------------|
| `POST /api/auth/register` | 5 | 1 minute |
| `POST /api/auth/login` | 5 | 1 minute |
| `POST /api/auth/refresh` | 10 | 1 hour |
| `POST /api/auth/forgot-password` | 3 | 15 minutes |
| `POST /api/auth/reset-password` | 5 | 1 hour |
| `POST /api/auth/demo-login` | 10 | 1 minute |
| `POST /api/sharing/invite` | 10 | 1 hour |
| `GET /api/export` | 5 | 1 hour |

Rate limiting is disabled in the `test` environment.

---

## Pagination

All list endpoints support pagination via query parameters:

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | integer | 1 | >= 1 | Page number |
| `limit` | integer | 20 | 1-100 | Items per page |

Paginated responses include a `pagination` object:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

## Error Response Format

All errors follow the [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) standard.

**Structure**

```json
{
  "type": "https://muaththir.app/errors/<error-code>",
  "title": "Error Name",
  "status": 422,
  "detail": "Human-readable explanation of what went wrong",
  "instance": "/api/auth/register"
}
```

| Field | Description |
|-------|-------------|
| `type` | URI identifying the error type |
| `title` | Short, human-readable error name |
| `status` | HTTP status code |
| `detail` | Explanation of the specific occurrence |
| `instance` | The request path that caused the error |
| `errors` | (Validation only) Field-level error details |

**Validation Error Example**

```json
{
  "type": "https://muaththir.app/errors/validation-error",
  "title": "ValidationError",
  "status": 422,
  "detail": "Password must be at least 8 characters",
  "instance": "/api/auth/register",
  "errors": {
    "password": ["Password must be at least 8 characters"]
  }
}
```

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Authenticated but not authorized for this resource |
| 404 | `NOT_FOUND` | Resource or route does not exist |
| 409 | `CONFLICT` | Resource already exists (e.g., duplicate email) |
| 422 | `VALIDATION_ERROR` | Input validation failed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Dimensions and Enums

### Dimensions

Observations, milestones, goals, and scores are organized by developmental dimension:

| Value | Description |
|-------|-------------|
| `academic` | Academic and cognitive development |
| `social_emotional` | Social and emotional development |
| `behavioural` | Behavioural development |
| `aspirational` | Goals and aspirations |
| `islamic` | Islamic education and values |
| `physical` | Physical development and health |

### Sentiments

| Value | Description |
|-------|-------------|
| `positive` | Positive or encouraging observation |
| `neutral` | Neutral observation |
| `needs_attention` | Area that needs attention or improvement |

### Age Bands

| Value | Age Range |
|-------|-----------|
| `early_years` | 3-5 years |
| `primary` | 6-8 years |
| `upper_primary` | 9-11 years |
| `secondary` | 12-16 years |

### Goal Statuses

| Value | Description |
|-------|-------------|
| `active` | Goal is in progress |
| `completed` | Goal has been achieved |
| `paused` | Goal is temporarily paused |

### Share Roles

| Value | Description |
|-------|-------------|
| `viewer` | Can view shared children data |
| `contributor` | Can view and add observations |

---

## Endpoints

### Health

#### `GET /api/health`

Returns the API and database status. No authentication required.

**Response** `200 OK`

```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

**Response** `503 Service Unavailable` (database down)

```json
{
  "status": "error",
  "database": "disconnected",
  "version": "1.0.0",
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

---

#### `GET /api/health/ready`

Kubernetes readiness probe. Pings the database to verify connectivity. No authentication required.

**Response** `200 OK`

```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

**Response** `503 Service Unavailable` (database down)

```json
{
  "status": "not_ready",
  "database": "disconnected",
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

---

### Auth

All auth endpoints are prefixed with `/api/auth`.

#### `POST /api/auth/register`

Create a new parent account. Rate limited: 5 requests per minute.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | 1-100 characters |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 chars, at least 1 uppercase letter, at least 1 number |

**Response** `201 Created`

```json
{
  "user": {
    "id": "clx...",
    "email": "fatima@example.com",
    "name": "Fatima Ahmed",
    "subscriptionTier": "free",
    "createdAt": "2026-02-07T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

A `refreshToken` HttpOnly cookie is also set on the response.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 409 | `CONFLICT` | Email already registered |
| 422 | `VALIDATION_ERROR` | Invalid input (missing fields, weak password, bad email) |

---

#### `POST /api/auth/login`

Authenticate with email and password. Rate limited: 5 requests per minute.

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Response** `200 OK`

```json
{
  "user": {
    "id": "clx...",
    "email": "fatima@example.com",
    "name": "Fatima Ahmed",
    "subscriptionTier": "free",
    "createdAt": "2026-02-07T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

A `refreshToken` HttpOnly cookie is also set on the response.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Invalid email or password |
| 422 | `VALIDATION_ERROR` | Missing or malformed fields |

---

#### `POST /api/auth/logout`

End the current session. **Requires authentication.**

**Response** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

The server deletes the session from the database and clears the `refreshToken` cookie.

---

#### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token. The refresh token is read from the HttpOnly cookie (no request body needed). Rate limited: 10 requests per hour.

**Response** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

A new `refreshToken` HttpOnly cookie replaces the old one (token rotation).

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing, invalid, or expired refresh token |

---

#### `POST /api/auth/forgot-password`

Request a password reset. Rate limited: 3 requests per 15 minutes.

Always returns the same response regardless of whether the email exists (prevents user enumeration).

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

**Response** `200 OK`

```json
{
  "message": "If an account exists, a reset link has been sent"
}
```

If the email exists, a reset token (valid for 1 hour) is generated and an email is sent with the reset link.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 422 | `VALIDATION_ERROR` | Invalid email format or missing email |

---

#### `POST /api/auth/reset-password`

Reset a password using a token from the forgot-password flow. Rate limited: 5 requests per hour.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `token` | string | Yes | The reset token received via email |
| `password` | string | Yes | Min 8 chars, at least 1 uppercase letter, at least 1 number |

**Response** `200 OK`

```json
{
  "message": "Password has been reset"
}
```

The reset token is cleared after successful use and cannot be reused.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Invalid or expired reset token |
| 422 | `VALIDATION_ERROR` | Missing token, missing password, or weak password |

---

#### `POST /api/auth/demo-login`

Create or log in as a demo user with pre-populated data. Rate limited: 10 requests per minute. No authentication required.

This endpoint creates a demo parent account (demo@muaththir.app), a demo child (Yusuf, age 4), and seeds 18 observations across all 6 dimensions plus milestone achievements if not already present.

**Response** `200 OK`

```json
{
  "user": {
    "id": "clx...",
    "email": "demo@muaththir.app",
    "name": "Demo Parent",
    "subscriptionTier": "free",
    "createdAt": "2026-02-07T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

A `refreshToken` HttpOnly cookie is also set on the response.

---

### Children

All children endpoints require authentication (`Authorization: Bearer <accessToken>`).

Children belong to the authenticated parent. Ownership is verified on every request -- a parent can only access their own children.

#### `POST /api/children`

Create a child profile.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | 1-100 characters |
| `dateOfBirth` | string | Yes | ISO 8601 date (`YYYY-MM-DD`) or datetime with offset. Child must be 3-16 years old. |
| `gender` | string | No | `"male"` or `"female"` |
| `medicalNotes` | string | No | Max 1000 characters. Nullable. |
| `allergies` | string[] | No | Array of strings |
| `specialNeeds` | string | No | Max 500 characters. Nullable. |

**Response** `201 Created`

```json
{
  "id": "clx...",
  "name": "Ahmad",
  "dateOfBirth": "2018-05-15",
  "gender": "male",
  "ageBand": "primary",
  "photoUrl": null,
  "medicalNotes": null,
  "allergies": [],
  "specialNeeds": null,
  "createdAt": "2026-02-07T12:00:00.000Z",
  "updatedAt": "2026-02-07T12:00:00.000Z"
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Child not between 3 and 16 years old |
| 403 | `FORBIDDEN` | Free tier limit exceeded (max 1 child) |
| 422 | `VALIDATION_ERROR` | Invalid input |

**Tier Limits**

| Tier | Max Children |
|------|-------------|
| `free` | 1 |
| `premium` | Unlimited |

---

#### `GET /api/children`

List all children belonging to the authenticated parent. Supports pagination.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "clx...",
      "name": "Ahmad",
      "dateOfBirth": "2018-05-15",
      "gender": "male",
      "ageBand": "primary",
      "photoUrl": null,
      "medicalNotes": null,
      "allergies": [],
      "specialNeeds": null,
      "createdAt": "2026-02-07T12:00:00.000Z",
      "updatedAt": "2026-02-07T12:00:00.000Z",
      "observationCount": 12,
      "milestoneProgress": {
        "total": 8,
        "achieved": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

---

#### `GET /api/children/:id`

Get a single child by ID.

**Response** `200 OK`

Returns a child object (same shape as create response, including health fields).

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

#### `PATCH /api/children/:id`

Update a child profile. Only provided fields are updated.

**Request Body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | 1-100 characters |
| `dateOfBirth` | string | ISO 8601 date. Child must be 3-16 years old after update. |
| `gender` | string \| null | `"male"`, `"female"`, or `null` to clear |
| `medicalNotes` | string \| null | Max 1000 characters. `null` to clear. |
| `allergies` | string[] | Array of strings |
| `specialNeeds` | string \| null | Max 500 characters. `null` to clear. |

**Response** `200 OK`

Returns the updated child object.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Updated age outside 3-16 range |
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |
| 422 | `VALIDATION_ERROR` | Invalid input |

---

#### `DELETE /api/children/:id`

Delete a child profile. This is a hard delete that removes the child and all associated data.

**Response** `204 No Content`

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

### Observations

Observations are developmental notes recorded by a parent about a child. All endpoints require authentication and verify child ownership.

Observations use soft delete -- deleted observations are marked with a `deletedAt` timestamp and excluded from queries.

#### `POST /api/children/:childId/observations`

Create a new observation for a child.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `dimension` | string | Yes | One of the six dimensions |
| `content` | string | Yes | 1-1000 characters |
| `sentiment` | string | Yes | `positive`, `neutral`, or `needs_attention` |
| `observedAt` | string | No | ISO 8601 date (`YYYY-MM-DD`). Defaults to today. Cannot be more than 1 year ago. |
| `tags` | string[] | No | Array of up to 5 tags, each max 50 characters. Defaults to `[]`. |

**Response** `201 Created`

```json
{
  "id": "clx...",
  "childId": "clx...",
  "dimension": "academic",
  "content": "Ahmad completed his reading assignment independently today.",
  "sentiment": "positive",
  "observedAt": "2026-02-07",
  "tags": ["reading", "independence"],
  "createdAt": "2026-02-07T12:00:00.000Z",
  "updatedAt": "2026-02-07T12:00:00.000Z"
}
```

Creating an observation automatically marks the corresponding dimension's score cache as stale.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |
| 422 | `VALIDATION_ERROR` | Invalid input (bad dimension, empty content, date > 1 year ago, etc.) |

---

#### `GET /api/children/:childId/observations`

List observations for a child. Supports pagination and filtering.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `dimension` | string | -- | Filter by dimension |
| `sentiment` | string | -- | Filter by sentiment |
| `from` | string | -- | Filter by observedAt >= date (`YYYY-MM-DD`) |
| `to` | string | -- | Filter by observedAt <= date (`YYYY-MM-DD`) |

**Response** `200 OK`

Returns a paginated list of observation objects.

---

#### `GET /api/children/:childId/observations/:id`

Get a single observation by ID.

**Response** `200 OK`

Returns a single observation object.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Observation not found, deleted, or child does not belong to parent |

---

#### `PATCH /api/children/:childId/observations/:id`

Update an observation. Only provided fields are updated.

**Request Body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `content` | string | 1-1000 characters |
| `sentiment` | string | `positive`, `neutral`, or `needs_attention` |
| `observedAt` | string | ISO 8601 date (`YYYY-MM-DD`) |
| `tags` | string[] | Array of up to 5 tags, each max 50 characters |

**Response** `200 OK`

Returns the updated observation object. Marks the dimension's score cache as stale.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Observation not found, deleted, or child does not belong to parent |
| 422 | `VALIDATION_ERROR` | Invalid input |

---

#### `DELETE /api/children/:childId/observations/:id`

Soft-delete an observation. The observation is marked with a `deletedAt` timestamp and excluded from all future queries.

**Response** `204 No Content`

Marks the dimension's score cache as stale.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Observation not found, already deleted, or child does not belong to parent |

---

### Goals

Goals track developmental objectives for a child. All endpoints require authentication and verify child ownership. Goals use hard delete.

#### `POST /api/children/:childId/goals`

Create a new goal. Can optionally be created from a goal template.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `title` | string | Yes* | 1-200 characters. *Optional if `templateId` is provided. |
| `dimension` | string | Yes* | One of the six dimensions. *Optional if `templateId` is provided. |
| `description` | string | No | Max 500 characters. Nullable. |
| `targetDate` | string | No | ISO 8601 date (`YYYY-MM-DD`). Nullable. |
| `templateId` | string | No | ID of a goal template. Template values are used as defaults; explicit values override them. |

**Response** `201 Created`

```json
{
  "id": "clx...",
  "childId": "clx...",
  "dimension": "academic",
  "title": "Read 20 books this month",
  "description": "Encourage daily reading habit",
  "targetDate": "2026-03-01",
  "status": "active",
  "templateId": null,
  "createdAt": "2026-02-07T12:00:00.000Z",
  "updatedAt": "2026-02-07T12:00:00.000Z"
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found, does not belong to parent, or template not found |
| 422 | `VALIDATION_ERROR` | Missing required fields (when not using template), invalid input |

---

#### `GET /api/children/:childId/goals`

List goals for a child. Supports pagination and filtering.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `dimension` | string | -- | Filter by dimension |
| `status` | string | -- | Filter by status (`active`, `completed`, `paused`) |

**Response** `200 OK`

Returns a paginated list of goal objects.

---

#### `GET /api/children/:childId/goals/:goalId`

Get a single goal by ID.

**Response** `200 OK`

Returns a single goal object.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Goal not found or child does not belong to parent |

---

#### `PATCH /api/children/:childId/goals/:goalId`

Update a goal. Only provided fields are updated.

**Request Body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `title` | string | 1-200 characters |
| `description` | string \| null | Max 500 characters |
| `targetDate` | string \| null | ISO 8601 date (`YYYY-MM-DD`) or `null` to clear |
| `status` | string | `active`, `completed`, or `paused` |
| `dimension` | string | One of the six dimensions |

**Response** `200 OK`

Returns the updated goal object.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Goal not found or child does not belong to parent |
| 422 | `VALIDATION_ERROR` | Invalid input |

---

#### `DELETE /api/children/:childId/goals/:goalId`

Hard-delete a goal. The goal is permanently removed.

**Response** `204 No Content`

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Goal not found or child does not belong to parent |

---

### Goal Templates

Goal templates provide pre-defined goals organized by dimension and age band. No authentication required.

#### `GET /api/goal-templates`

List goal templates. Supports pagination and filtering.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page (max 100) |
| `dimension` | string | -- | Filter by dimension |
| `ageBand` | string | -- | Filter by age band |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "clx...",
      "dimension": "academic",
      "ageBand": "primary",
      "title": "Read 10 books this term",
      "description": "Build a daily reading habit with age-appropriate books.",
      "sortOrder": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 24,
    "totalPages": 1,
    "hasMore": false
  }
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 422 | `VALIDATION_ERROR` | Invalid dimension or ageBand value |

---

### Milestones

Milestones track a child's developmental progress against age-appropriate benchmarks. There are two sets of endpoints: **milestone definitions** (public catalog) and **child milestones** (per-child progress tracking).

#### `GET /api/milestones`

List milestone definitions. No authentication required. Supports pagination and filtering.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `dimension` | string | -- | Filter by dimension |
| `ageBand` | string | -- | Filter by age band |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "clx...",
      "dimension": "academic",
      "ageBand": "primary",
      "title": "Can read independently for 15 minutes",
      "description": "Child can sustain focused reading without adult assistance.",
      "guidance": "Encourage daily reading time with age-appropriate books.",
      "sortOrder": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 48,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Invalid dimension or ageBand value |

---

#### `GET /api/children/:childId/milestones`

Get milestone progress for a specific child. Returns all milestone definitions along with the child's achievement status. **Requires authentication.**

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `dimension` | string | -- | Filter by dimension |
| `ageBand` | string | -- | Filter by age band |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "clx...",
      "dimension": "academic",
      "ageBand": "primary",
      "title": "Can read independently for 15 minutes",
      "description": "Child can sustain focused reading without adult assistance.",
      "guidance": "Encourage daily reading time with age-appropriate books.",
      "sortOrder": 1,
      "achieved": true,
      "achievedAt": "2026-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 48,
    "totalPages": 3,
    "hasMore": true
  }
}
```

Milestones use lazy row creation: `ChildMilestone` records are only created when a milestone is toggled, not when listed.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Invalid dimension or ageBand value |
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

#### `PATCH /api/children/:childId/milestones/:milestoneId`

Toggle a milestone as achieved or not achieved. **Requires authentication.**

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `achieved` | boolean | Yes | `true` to mark as achieved, `false` to unmark |

**Response** `200 OK`

```json
{
  "id": "clx...",
  "dimension": "academic",
  "ageBand": "primary",
  "title": "Can read independently for 15 minutes",
  "description": "Child can sustain focused reading without adult assistance.",
  "guidance": "Encourage daily reading time with age-appropriate books.",
  "sortOrder": 1,
  "achieved": true,
  "achievedAt": "2026-02-07T12:00:00.000Z",
  "achievedHistory": [
    { "type": "achieved", "at": "2026-02-07T12:00:00.000Z" }
  ]
}
```

The `achievedHistory` array maintains a full audit trail of all toggles.

Toggling a milestone automatically marks the corresponding dimension's score cache as stale.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child or milestone not found, or child does not belong to parent |
| 422 | `VALIDATION_ERROR` | Missing or invalid `achieved` field |

---

### Dashboard

Dashboard endpoints provide aggregated scores and summaries for a child across all six developmental dimensions. All endpoints require authentication and verify child ownership.

#### Score Formula

Each dimension receives a score from 0-100 calculated as:

```
score = (observation_factor * 0.4) + (milestone_factor * 0.4) + (sentiment_factor * 0.2)
```

Where:

| Factor | Calculation |
|--------|-------------|
| `observation_factor` | `min(observations_last_30_days, 10) / 10 * 100` |
| `milestone_factor` | `milestones_achieved / milestones_total_for_age_band * 100` |
| `sentiment_factor` | `positive_observations / total_observations_last_30_days * 100` |

Scores are cached per dimension using a `ScoreCache` table. Caches are automatically invalidated (marked stale) when observations or milestones change. Stale dimensions are recalculated on the next dashboard request.

---

#### `GET /api/dashboard/:childId`

Get radar chart scores for all six dimensions.

**Response** `200 OK`

```json
{
  "childId": "clx...",
  "childName": "Ahmad",
  "ageBand": "primary",
  "overallScore": 45,
  "dimensions": [
    {
      "dimension": "academic",
      "score": 60,
      "factors": {
        "observation": 40,
        "milestone": 75,
        "sentiment": 80
      },
      "observationCount": 4,
      "milestoneProgress": {
        "achieved": 3,
        "total": 4
      }
    }
  ],
  "calculatedAt": "2026-02-07T12:00:00.000Z"
}
```

When a dimension's score is served from cache (not stale), the `factors` will be zeroed to avoid the cost of recalculation.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

#### `GET /api/dashboard/:childId/recent`

Get the 5 most recent observations for a child.

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "clx...",
      "dimension": "academic",
      "content": "Ahmad completed his reading assignment independently today.",
      "sentiment": "positive",
      "observedAt": "2026-02-07T00:00:00.000Z",
      "tags": ["reading", "independence"],
      "createdAt": "2026-02-07T12:00:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

#### `GET /api/dashboard/:childId/activity`

Get a unified activity feed combining recent observations, milestone achievements, and goal updates, sorted by timestamp descending.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Max items to return (max 50) |

**Response** `200 OK`

```json
{
  "data": [
    {
      "type": "observation",
      "id": "clx...",
      "dimension": "academic",
      "content": "Wrote his name independently.",
      "sentiment": "positive",
      "timestamp": "2026-02-07T12:00:00.000Z"
    },
    {
      "type": "milestone",
      "id": "clx...",
      "dimension": "physical",
      "title": "Can ride a bicycle",
      "achievedAt": "2026-02-06T10:00:00.000Z",
      "timestamp": "2026-02-06T10:00:00.000Z"
    },
    {
      "type": "goal_update",
      "id": "clx...",
      "title": "Read 20 books",
      "status": "completed",
      "updatedAt": "2026-02-05T08:00:00.000Z",
      "timestamp": "2026-02-05T08:00:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

#### `GET /api/dashboard/:childId/milestones-due`

Get the next 3 unchecked milestones for a child's age band, ordered by dimension and sort order.

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "clx...",
      "dimension": "academic",
      "title": "Can write a short paragraph",
      "description": "Child can compose 3-5 sentences on a given topic.",
      "ageBand": "primary",
      "sortOrder": 2
    }
  ]
}
```

Returns an empty array if the child is outside the supported age range (3-16 years).

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

### Insights

AI-powered (rule-based) developmental insights. Requires authentication and verifies child ownership.

#### `GET /api/dashboard/:childId/insights`

Analyze observations, milestones, and scores to produce strengths, areas for growth, recommendations, and trends.

**Response** `200 OK`

```json
{
  "childId": "clx...",
  "childName": "Ahmad",
  "generatedAt": "2026-02-07T12:00:00.000Z",
  "summary": "Ahmad shows strength in Academic, Physical. Behavioural could use more attention. overall trend is positive.",
  "strengths": [
    {
      "dimension": "academic",
      "title": "Strong Academic Engagement",
      "detail": "5 observations with 80% positive sentiment in academic over the past 30 days.",
      "score": 72
    }
  ],
  "areasForGrowth": [
    {
      "dimension": "behavioural",
      "title": "Behavioural Needs Attention",
      "detail": "Only 1 behavioural observation logged. Consider tracking more behavioural activities.",
      "score": 12,
      "suggestions": [
        "Observe daily routines and habits",
        "Note positive behaviour patterns"
      ]
    }
  ],
  "recommendations": [
    {
      "type": "observation_gap",
      "message": "You haven't logged any islamic observations this month. Try: log quran practice sessions.",
      "priority": "medium"
    },
    {
      "type": "sentiment_alert",
      "message": "Multiple concerns noted in social & emotional. Review recent social & emotional observations.",
      "priority": "high"
    },
    {
      "type": "milestone_reminder",
      "message": "5 milestones are due for Ahmad's age band. Check the milestones page.",
      "priority": "low"
    },
    {
      "type": "consistency_praise",
      "message": "Great balance! You've logged observations across all 6 dimensions this month.",
      "priority": "low"
    },
    {
      "type": "streak_notice",
      "message": "Great consistency! 8 observations logged in the past week.",
      "priority": "low"
    }
  ],
  "trends": {
    "overallDirection": "improving",
    "dimensionTrends": {
      "academic": "improving",
      "social_emotional": "needs_attention",
      "behavioural": "stable",
      "aspirational": "no_data",
      "islamic": "declining",
      "physical": "improving"
    }
  }
}
```

**Strength Criteria**: score >= 60 AND >= 3 observations in last 30 days. Max 3 returned, sorted by score descending.

**Area for Growth Criteria**: score < 40 OR < 2 observations in last 30 days.

**Trend Directions**: `improving` (current > previous 30 days), `declining` (current < previous), `stable` (equal), `no_data` (zero observations ever), `needs_attention` (>50% needs_attention sentiment).

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

### Reports

Comprehensive report aggregating dashboard, insights, observations, milestones, and goals. Requires authentication.

#### `GET /api/children/:childId/reports/summary`

Generate a full developmental summary report.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | string | 30 days ago | Start date (`YYYY-MM-DD`) for observation filtering |
| `to` | string | Today | End date (`YYYY-MM-DD`) for observation filtering |
| `observations` | integer | 10 | Number of recent observations to include (1-100) |

**Response** `200 OK`

```json
{
  "childId": "clx...",
  "childName": "Ahmad",
  "ageBand": "primary",
  "generatedAt": "2026-02-07T12:00:00.000Z",
  "dateRange": {
    "from": "2026-01-08",
    "to": "2026-02-07"
  },
  "overallScore": 45,
  "dimensions": [
    {
      "dimension": "academic",
      "score": 60,
      "factors": { "observation": 40, "milestone": 75, "sentiment": 80 },
      "observationCount": 4,
      "milestoneProgress": { "achieved": 3, "total": 4 }
    }
  ],
  "insights": {
    "summary": "Ahmad shows strength in Academic.",
    "strengths": [],
    "areasForGrowth": [],
    "recommendations": [],
    "trends": {
      "overallDirection": "stable",
      "dimensionTrends": {}
    }
  },
  "recentObservations": [
    {
      "id": "clx...",
      "dimension": "academic",
      "content": "Completed reading assignment.",
      "sentiment": "positive",
      "observedAt": "2026-02-07",
      "tags": ["reading"],
      "createdAt": "2026-02-07T12:00:00.000Z"
    }
  ],
  "milestoneProgress": {
    "totalAchieved": 5,
    "totalAvailable": 12,
    "byDimension": {
      "academic": { "achieved": 2, "total": 4 },
      "physical": { "achieved": 3, "total": 4 }
    }
  },
  "goals": {
    "active": 3,
    "completed": 1,
    "paused": 0
  },
  "observationsByDimension": {
    "academic": 5,
    "physical": 3,
    "social_emotional": 2
  }
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

### Profile

Profile endpoints allow the authenticated parent to view and modify their own account. All endpoints require authentication.

#### `GET /api/profile`

Get the current parent's profile.

**Response** `200 OK`

```json
{
  "id": "clx...",
  "name": "Fatima Ahmed",
  "email": "fatima@example.com",
  "subscriptionTier": "free",
  "createdAt": "2026-02-07T12:00:00.000Z",
  "childCount": 1
}
```

---

#### `PUT /api/profile`

Update the parent's name and/or email.

**Request Body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | 1-100 characters |
| `email` | string | Valid email format, must not already be in use by another account |

**Response** `200 OK`

```json
{
  "id": "clx...",
  "name": "Fatima Ibrahim",
  "email": "fatima@example.com",
  "subscriptionTier": "free",
  "createdAt": "2026-02-07T12:00:00.000Z"
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 409 | `CONFLICT` | Email already in use by another account |
| 422 | `VALIDATION_ERROR` | Invalid input |

---

#### `PUT /api/profile/password`

Change the parent's password.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `currentPassword` | string | Yes | Must match the current password |
| `newPassword` | string | Yes | Min 8 chars, at least 1 uppercase letter, at least 1 number |

**Response** `200 OK`

```json
{
  "message": "Password updated successfully"
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Current password is incorrect |
| 422 | `VALIDATION_ERROR` | Missing fields or weak new password |

---

#### `GET /api/profile/notifications`

Get notification preferences.

**Response** `200 OK`

```json
{
  "dailyReminder": true,
  "weeklyDigest": true,
  "milestoneAlerts": true
}
```

---

#### `PUT /api/profile/notifications`

Update notification preferences. Only provided fields are updated.

**Request Body** (all fields optional)

| Field | Type | Description |
|-------|------|-------------|
| `dailyReminder` | boolean | Enable/disable daily observation reminders |
| `weeklyDigest` | boolean | Enable/disable weekly progress digest |
| `milestoneAlerts` | boolean | Enable/disable milestone achievement alerts |

**Response** `200 OK`

```json
{
  "dailyReminder": true,
  "weeklyDigest": false,
  "milestoneAlerts": true
}
```

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 422 | `VALIDATION_ERROR` | Non-boolean values provided |

---

### Sharing

Family sharing allows parents to invite other users to view or contribute to their children's profiles. All endpoints require authentication.

#### `POST /api/sharing/invite`

Invite a family member by email. Rate limited: 10 requests per hour.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | Yes | Valid email address. Cannot be the parent's own email. |
| `role` | string | No | `viewer` (default) or `contributor` |
| `childIds` | string[] | No | Specific child IDs to share. If omitted, all children are shared. |

**Response** `201 Created`

```json
{
  "id": "clx...",
  "parentId": "clx...",
  "inviteeEmail": "family@example.com",
  "inviteeId": null,
  "role": "viewer",
  "status": "pending",
  "childIds": ["clx..."],
  "invitedAt": "2026-02-07T12:00:00.000Z",
  "respondedAt": null,
  "createdAt": "2026-02-07T12:00:00.000Z",
  "updatedAt": "2026-02-07T12:00:00.000Z"
}
```

If the invitee already has a Muaththir account, `inviteeId` is populated.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Self-invite attempted |
| 404 | `NOT_FOUND` | One or more child IDs not found |
| 409 | `CONFLICT` | Invitation already exists for this email |
| 422 | `VALIDATION_ERROR` | Invalid email format |

---

#### `GET /api/sharing`

List all shares created by the authenticated parent.

**Response** `200 OK`

Returns an array of share objects (same shape as invite response).

---

#### `PATCH /api/sharing/:id`

Update a share (role and/or child IDs). Only the share owner can update.

**Request Body** (all fields optional)

| Field | Type | Rules |
|-------|------|-------|
| `role` | string | `viewer` or `contributor` |
| `childIds` | string[] | Must be IDs of children belonging to the parent |

**Response** `200 OK`

Returns the updated share object.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | Not the share owner |
| 404 | `NOT_FOUND` | Share not found or child IDs not found |

---

#### `DELETE /api/sharing/:id`

Revoke a share. Only the share owner can revoke.

**Response** `204 No Content`

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | Not the share owner |
| 404 | `NOT_FOUND` | Share not found |

---

#### `GET /api/sharing/shared-with-me`

List all shares where the authenticated user is the invitee (by email or inviteeId).

**Response** `200 OK`

Returns an array of share objects.

---

#### `POST /api/sharing/:id/respond`

Accept or decline a sharing invitation. Only the invitee can respond.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `action` | string | Yes | `accept` or `decline` |

**Response** `200 OK`

Returns the updated share object with `status` set to `accepted` or `declined`, and `respondedAt` populated.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Invitation already responded to |
| 403 | `FORBIDDEN` | Not the invitee |
| 404 | `NOT_FOUND` | Share not found |

---

### Export

Data export for GDPR compliance and data portability. Requires authentication.

#### `GET /api/export`

Export all parent data including profile, children, observations, milestones, and goals. Rate limited: 5 requests per hour.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `json` | Export format: `json` or `csv` |

**Response** `200 OK` (JSON format)

```json
{
  "exportedAt": "2026-02-07T12:00:00.000Z",
  "profile": {
    "name": "Fatima Ahmed",
    "email": "fatima@example.com",
    "subscriptionTier": "free"
  },
  "children": [
    {
      "name": "Ahmad",
      "dateOfBirth": "2018-05-15",
      "gender": "male",
      "observations": [
        {
          "dimension": "academic",
          "content": "Completed reading assignment.",
          "sentiment": "positive",
          "observedAt": "2026-02-07",
          "tags": ["reading"]
        }
      ],
      "milestones": [
        {
          "achieved": true,
          "milestoneTitle": "Can read independently",
          "dimension": "academic"
        }
      ],
      "goals": [
        {
          "title": "Read 20 books",
          "dimension": "academic",
          "status": "active",
          "targetDate": "2026-03-01"
        }
      ]
    }
  ]
}
```

The response includes `Content-Disposition: attachment` header for automatic download.

**Response** `200 OK` (CSV format)

Returns CSV with headers: `child_name,dimension,content,sentiment,observed_at,tags`

Tags are joined with semicolons. Soft-deleted observations are excluded.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Invalid format value |

---

### Photo Upload

Upload a profile photo for a child. Requires `@fastify/multipart` to be installed. Requires authentication.

#### `POST /api/children/:childId/photo`

Upload a child's profile photo using `multipart/form-data`.

**Request**

- Content-Type: `multipart/form-data`
- Field name: `photo`
- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Max size: 5 MB

**Response** `200 OK`

Returns the updated child object with the new `photoUrl` field populated (e.g., `/uploads/photos/childId-timestamp.jpg`).

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | No file uploaded, wrong field name, invalid file type, or file too large |
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |
