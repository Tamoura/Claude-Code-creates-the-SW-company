# Mu'aththir API Reference

**Base URL**: `http://localhost:5005/api`

All endpoints are prefixed with `/api`. Request and response bodies use JSON (`Content-Type: application/json`).

For the full OpenAPI specification, see [api-schema.yml](api-schema.yml).

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

Create a new parent account.

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

Authenticate with email and password.

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

## Access Token Payload

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
