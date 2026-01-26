# ADR-003: Authentication & Authorization Approach

## Status
Accepted

## Context

The ITIL Dashboard requires:
- Secure user authentication (login, logout, password reset)
- Role-based access control (Admin, Manager, Operator)
- Session management with configurable timeout (30 minutes)
- Audit trail for security events
- Protection against common attacks (CSRF, XSS, injection)

## Decision

### Authentication Strategy: JWT with HTTP-Only Cookies

We will use JSON Web Tokens (JWT) stored in HTTP-only cookies for authentication.

**Token Structure:**
```typescript
interface AccessToken {
  sub: string;        // User ID
  email: string;      // User email
  role: Role;         // User role
  iat: number;        // Issued at
  exp: number;        // Expiration
}

interface RefreshToken {
  sub: string;        // User ID
  jti: string;        // Token ID (for revocation)
  iat: number;        // Issued at
  exp: number;        // Expiration
}
```

**Token Lifecycle:**

| Token | Location | Duration | Refresh |
|-------|----------|----------|---------|
| Access Token | HTTP-only cookie | 15 minutes | Auto-refresh on activity |
| Refresh Token | HTTP-only cookie | 7 days | Rotated on use |

### Cookie Configuration

```typescript
const cookieOptions = {
  httpOnly: true,       // Prevent XSS access
  secure: true,         // HTTPS only (production)
  sameSite: 'lax',      // CSRF protection
  path: '/',
  domain: process.env.COOKIE_DOMAIN,
};

const accessCookie = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000,  // 15 minutes
};

const refreshCookie = {
  ...cookieOptions,
  path: '/api/auth/refresh',  // Limited path
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
};
```

### Authorization: Role-Based Access Control (RBAC)

**Roles:**

| Role | Level | Description |
|------|-------|-------------|
| Admin | 3 | Full system access, user management |
| Manager | 2 | Team management, approvals, reports |
| Operator | 1 | Day-to-day operations, ticket handling |

**Permission Matrix:**

```typescript
const permissions = {
  // User Management
  'users:create':     ['admin'],
  'users:read':       ['admin', 'manager'],
  'users:update':     ['admin'],
  'users:delete':     ['admin'],

  // Incidents
  'incidents:create': ['admin', 'manager', 'operator'],
  'incidents:read':   ['admin', 'manager', 'operator'],
  'incidents:update': ['admin', 'manager', 'operator'],
  'incidents:assign': ['admin', 'manager'],
  'incidents:delete': ['admin'],

  // Problems
  'problems:create':  ['admin', 'manager'],
  'problems:read':    ['admin', 'manager', 'operator'],
  'problems:update':  ['admin', 'manager'],
  'problems:delete':  ['admin'],

  // Changes
  'changes:create':   ['admin', 'manager', 'operator'],
  'changes:read':     ['admin', 'manager', 'operator'],
  'changes:update':   ['admin', 'manager'],
  'changes:approve':  ['admin', 'manager'],
  'changes:delete':   ['admin'],

  // Service Requests
  'requests:create':  ['admin', 'manager', 'operator'],
  'requests:read':    ['admin', 'manager', 'operator'],
  'requests:fulfill': ['admin', 'manager', 'operator'],
  'requests:approve': ['admin', 'manager'],

  // Knowledge Base
  'knowledge:create': ['admin', 'manager'],
  'knowledge:read':   ['admin', 'manager', 'operator'],
  'knowledge:update': ['admin', 'manager'],
  'knowledge:delete': ['admin'],
  'knowledge:draft':  ['admin', 'manager', 'operator'],

  // Reports
  'reports:read':     ['admin', 'manager', 'operator'],
  'reports:export':   ['admin', 'manager', 'operator'],

  // Admin
  'admin:access':     ['admin'],
  'admin:sla':        ['admin'],
  'admin:categories': ['admin'],
  'admin:import':     ['admin', 'manager'],
  'admin:export':     ['admin', 'manager', 'operator'],
};
```

### Authentication Flow

**Login Flow:**

```
1. User submits email/password
2. Backend validates credentials
3. Backend generates access + refresh tokens
4. Backend sets HTTP-only cookies
5. Backend logs authentication event
6. Frontend redirects to dashboard
```

**Request Authentication:**

```
1. Request includes cookies automatically
2. Middleware extracts access token
3. Middleware validates token signature
4. Middleware checks expiration
5. If expired: attempt refresh
6. If valid: attach user to request
7. If invalid: return 401
```

**Logout Flow:**

```
1. User clicks logout
2. Backend receives request
3. Backend invalidates refresh token (add to blocklist)
4. Backend clears cookies
5. Backend logs logout event
6. Frontend redirects to login
```

**Password Reset Flow:**

```
1. User requests password reset
2. Backend generates secure token (UUID v4)
3. Backend stores token with expiration (1 hour)
4. Backend sends reset email (future: currently stores for admin)
5. User clicks reset link with token
6. Backend validates token
7. User sets new password
8. Backend invalidates token
9. Backend logs password reset event
```

### Security Measures

**Password Security:**
- Minimum 8 characters
- Requires uppercase, lowercase, number, special character
- Hashed with bcrypt (cost factor 12)
- Password history (prevent reuse of last 5)

**Brute Force Protection:**
- Rate limiting: 5 failed attempts per 15 minutes
- Account lockout after 10 consecutive failures
- Lockout duration: 30 minutes
- IP-based rate limiting: 100 requests/minute

**Session Security:**
- Inactivity timeout: 30 minutes (configurable)
- Concurrent session limit: 3 devices
- Session invalidation on password change
- Refresh token rotation

**Token Security:**
- Strong secret key (256-bit minimum)
- Token ID (jti) for revocation
- Refresh token blocklist in database

### Implementation

**Backend Middleware:**

```typescript
// Authentication middleware
const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.cookies.access_token;

  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const decoded = await request.jwtVerify();
    request.user = decoded;
  } catch (err) {
    if (err.code === 'FAST_JWT_EXPIRED') {
      // Attempt refresh
      return refreshAndRetry(request, reply);
    }
    return reply.code(401).send({ error: 'Invalid token' });
  }
};

// Authorization middleware
const authorize = (...requiredPermissions: Permission[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user;

    const hasPermission = requiredPermissions.every(
      perm => permissions[perm].includes(role)
    );

    if (!hasPermission) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
};
```

**Frontend Auth Context:**

```typescript
interface AuthContext {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}
```

### Audit Logging

All authentication events are logged:

```typescript
interface AuthAuditLog {
  id: string;
  userId: string | null;
  event: AuthEvent;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
}

type AuthEvent =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'token_refreshed'
  | 'account_locked'
  | 'account_unlocked';
```

## Consequences

### Positive

- **Security**: HTTP-only cookies prevent XSS token theft
- **Simplicity**: No token management on frontend
- **Auto-refresh**: Seamless token rotation
- **Audit Trail**: Complete security event history
- **Flexibility**: Role-based permissions easily extensible

### Negative

- **Cookie Size**: Limited to ~4KB (acceptable for our tokens)
- **CORS Complexity**: Credentials mode required
- **Blocklist Storage**: Refresh token blocklist needs cleanup

### Neutral

- **No OAuth**: Standalone app, no external auth providers (per requirements)
- **No MFA**: Out of scope for MVP, can be added later

## Alternatives Considered

### LocalStorage Tokens
- Pros: Simple, works across tabs
- Cons: XSS vulnerable, manual refresh
- Why rejected: Security risk

### Session-Based Auth
- Pros: Server controls everything
- Cons: Doesn't scale, stateful servers
- Why rejected: Complicates horizontal scaling

### OAuth/OIDC
- Pros: Industry standard, delegate auth
- Cons: Complexity, external dependency
- Why rejected: Standalone app requirement

### Passport.js
- Pros: Many strategies, well-documented
- Cons: Express-focused, adds complexity
- Why rejected: Not needed for JWT-only auth

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://auth0.com/blog/jwt-authentication-best-practices/)
- [@fastify/jwt Documentation](https://github.com/fastify/fastify-jwt)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
