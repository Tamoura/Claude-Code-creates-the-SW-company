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
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Auth](#auth)
  - [Children](#children)
  - [Observations](#observations)
  - [Milestones](#milestones)
  - [Dashboard](#dashboard)
  - [Profile](#profile)

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
| `POST /api/auth/forgot-password` | 3 | 1 hour |

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

**Request Example**

```json
{
  "name": "Fatima Ahmed",
  "email": "fatima@example.com",
  "password": "SecurePass1"
}
```

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

**Request Example**

```json
{
  "email": "fatima@example.com",
  "password": "SecurePass1"
}
```

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

**Headers**

```
Authorization: Bearer <accessToken>
```

**Response** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

The server deletes the session from the database and clears the `refreshToken` cookie.

---

#### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token. The refresh token is read from the HttpOnly cookie (no request body needed).

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

Request a password reset. Rate limited: 3 requests per hour.

Always returns the same response regardless of whether the email exists (prevents user enumeration).

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |

**Request Example**

```json
{
  "email": "fatima@example.com"
}
```

**Response** `200 OK`

```json
{
  "message": "If an account exists, a reset link has been sent"
}
```

If the email exists, a reset token (valid for 1 hour) is generated and stored in the database.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 422 | `VALIDATION_ERROR` | Invalid email format or missing email |

---

#### `POST /api/auth/reset-password`

Reset a password using a token from the forgot-password flow.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `token` | string | Yes | The reset token received via email |
| `password` | string | Yes | Min 8 chars, at least 1 uppercase letter, at least 1 number |

**Request Example**

```json
{
  "token": "a1b2c3d4e5f6...",
  "password": "NewSecurePass1"
}
```

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

### Children

All children endpoints require authentication (`Authorization: Bearer <accessToken>`).

Children belong to the authenticated parent. Ownership is verified on every request -- a parent can only access their own children.

#### `POST /api/children`

Create a child profile.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | 1-100 characters |
| `dateOfBirth` | string | Yes | ISO 8601 date (`YYYY-MM-DD`) or datetime. Child must be 3-16 years old. |
| `gender` | string | No | `"male"` or `"female"` |

**Request Example**

```json
{
  "name": "Ahmad",
  "dateOfBirth": "2018-05-15",
  "gender": "male"
}
```

**Response** `201 Created`

```json
{
  "id": "clx...",
  "name": "Ahmad",
  "dateOfBirth": "2018-05-15",
  "gender": "male",
  "ageBand": "primary",
  "photoUrl": null,
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

```json
{
  "id": "clx...",
  "name": "Ahmad",
  "dateOfBirth": "2018-05-15",
  "gender": "male",
  "ageBand": "primary",
  "photoUrl": null,
  "createdAt": "2026-02-07T12:00:00.000Z",
  "updatedAt": "2026-02-07T12:00:00.000Z"
}
```

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

**Request Example**

```json
{
  "name": "Ahmad Ibrahim"
}
```

**Response** `200 OK`

Returns the updated child object (same shape as GET response).

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

#### Dimensions

Observations are categorized into one of six developmental dimensions:

| Value | Description |
|-------|-------------|
| `academic` | Academic and cognitive development |
| `social_emotional` | Social and emotional development |
| `behavioural` | Behavioural development |
| `aspirational` | Goals and aspirations |
| `islamic` | Islamic education and values |
| `physical` | Physical development and health |

#### Sentiments

Each observation has a sentiment:

| Value | Description |
|-------|-------------|
| `positive` | Positive or encouraging observation |
| `neutral` | Neutral observation |
| `needs_attention` | Area that needs attention or improvement |

---

#### `POST /api/children/:childId/observations`

Create a new observation for a child.

**Request Body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `dimension` | string | Yes | One of the six dimensions (see above) |
| `content` | string | Yes | 1-1000 characters |
| `sentiment` | string | Yes | `positive`, `neutral`, or `needs_attention` |
| `observedAt` | string | No | ISO 8601 date (`YYYY-MM-DD`). Defaults to today. Cannot be more than 1 year ago. |
| `tags` | string[] | No | Array of up to 5 tags, each max 50 characters. Defaults to `[]`. |

**Request Example**

```json
{
  "dimension": "academic",
  "content": "Ahmad completed his reading assignment independently today.",
  "sentiment": "positive",
  "observedAt": "2026-02-07",
  "tags": ["reading", "independence"]
}
```

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
| 422 | `VALIDATION_ERROR` | Invalid input (bad dimension, empty content, future date, etc.) |

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

```json
{
  "data": [
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

#### `GET /api/children/:childId/observations/:id`

Get a single observation by ID.

**Response** `200 OK`

Returns a single observation object (same shape as items in the list response).

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

**Request Example**

```json
{
  "sentiment": "needs_attention",
  "tags": ["reading", "focus"]
}
```

**Response** `200 OK`

Returns the updated observation object.

Updating an observation automatically marks the corresponding dimension's score cache as stale.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Observation not found, deleted, or child does not belong to parent |
| 422 | `VALIDATION_ERROR` | Invalid input |

---

#### `DELETE /api/children/:childId/observations/:id`

Soft-delete an observation. The observation is marked with a `deletedAt` timestamp and excluded from all future queries.

**Response** `204 No Content`

Deleting an observation automatically marks the corresponding dimension's score cache as stale.

**Error Responses**

| Status | Code | When |
|--------|------|------|
| 404 | `NOT_FOUND` | Observation not found, already deleted, or child does not belong to parent |

---

### Milestones

Milestones track a child's developmental progress against age-appropriate benchmarks. There are two sets of endpoints: **milestone definitions** (public catalog) and **child milestones** (per-child progress tracking).

#### Age Bands

Milestones are organized by age band:

| Value | Age Range |
|-------|-----------|
| `early_years` | 3-5 years |
| `primary` | 6-8 years |
| `upper_primary` | 9-11 years |
| `secondary` | 12-16 years |

---

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
    },
    {
      "id": "clx...",
      "dimension": "academic",
      "ageBand": "primary",
      "title": "Can write a short paragraph",
      "description": "Child can compose 3-5 sentences on a given topic.",
      "guidance": "Provide daily writing prompts and celebrate effort.",
      "sortOrder": 2,
      "achieved": false,
      "achievedAt": null
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
| 404 | `NOT_FOUND` | Child not found or does not belong to parent |

---

#### `PATCH /api/children/:childId/milestones/:milestoneId`

Toggle a milestone as achieved or not achieved. **Requires authentication.**

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `achieved` | boolean | Yes | `true` to mark as achieved, `false` to unmark |

**Request Example**

```json
{
  "achieved": true
}
```

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
    },
    {
      "dimension": "social_emotional",
      "score": 30,
      "factors": {
        "observation": 20,
        "milestone": 50,
        "sentiment": 50
      },
      "observationCount": 2,
      "milestoneProgress": {
        "achieved": 2,
        "total": 4
      }
    }
  ],
  "calculatedAt": "2026-02-07T12:00:00.000Z"
}
```

When a dimension's score is served from cache (not stale), the `factors`, `observationCount`, and `milestoneProgress` fields will be zeroed to avoid the cost of recalculation.

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

**Request Example**

```json
{
  "name": "Fatima Ibrahim"
}
```

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

**Request Example**

```json
{
  "currentPassword": "OldSecurePass1",
  "newPassword": "NewSecurePass2"
}
```

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
