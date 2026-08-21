# Secure Coding Protocol — ConnectSW

**Version:** 1.0
**Applies to:** All coding agents (Backend Engineer, Frontend Engineer, Mobile Developer)
**When to read:** Before writing any implementation code
**References:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), OWASP Agentic Top 10

---

## Why This Exists

Security vulnerabilities in production are not a QA failure — they are a **development failure**. The gap between what agents are told to do (security checklists) and what tooling enforces (ESLint rules, SAST) is where vulnerabilities live.

This protocol maps every OWASP risk category to the exact code patterns you must follow and the ESLint rules that enforce them. Read it before writing code, not after a security review.

---

## OWASP Top 10 → Code Patterns

### A01: Broken Access Control

Every endpoint that returns user-owned data MUST verify ownership. Never trust the requester's claimed identity without checking the database.

```typescript
// ❌ BOLA — user can access ANY order by ID
async function getOrder(req: Request): Promise<Order> {
  return db.order.findUnique({ where: { id: req.params.id } });
}

// ✅ Object-level authorization check
async function getOrder(req: Request): Promise<Order> {
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  if (!order) { throw new AppError('NOT_FOUND'); }
  if (order.userId !== req.user.id) { throw new AppError('FORBIDDEN'); }
  return order;
}
```

**Function-level (role) authorization:**
```typescript
// ✅ Check role BEFORE running business logic
async function deleteUser(req: Request): Promise<void> {
  if (req.user.role !== 'admin') {
    logger.warn({ userId: req.user.id }, 'Unauthorized delete attempt');
    throw new AppError('FORBIDDEN');
  }
  await userService.delete(req.params.userId);
}
```

**ESLint:** No automated rule — enforced by Code Review.

---

### A02: Cryptographic Failures

Never store sensitive data in plaintext. Never use weak algorithms.

```typescript
// ❌ Plaintext password storage
await db.user.create({ data: { password: rawPassword } });

// ✅ bcrypt with cost factor >= 12
import { hash } from 'bcrypt';
const BCRYPT_ROUNDS = 12; // never below 12
const passwordHash = await hash(rawPassword, BCRYPT_ROUNDS);
await db.user.create({ data: { passwordHash } });

// ❌ Regular string comparison — leaks timing information
if (providedToken === storedToken) { ... }

// ✅ Timing-safe comparison
import { timingSafeEqual } from 'crypto';
const isValid = timingSafeEqual(
  Buffer.from(providedToken, 'hex'),
  Buffer.from(storedToken, 'hex'),
);

// ❌ Math.random() for tokens — predictable
const token = Math.random().toString(36);

// ✅ Cryptographically secure randomness
import { randomBytes } from 'crypto';
const token = randomBytes(32).toString('hex');
```

**ESLint rules:**
- `security/detect-pseudoRandomBytes: error` — catches Math.random() for security use
- `security/detect-possible-timing-attacks: error` — catches === on secrets

**Token storage:**
```typescript
// ❌ Store token in plaintext — database breach exposes all tokens
await db.verificationToken.create({ data: { token } });

// ✅ Store SHA-256 hash — breach reveals nothing
import { createHash } from 'crypto';
const tokenHash = createHash('sha256').update(token).digest('hex');
await db.verificationToken.create({ data: { tokenHash } });
// Send raw token to user; verify by hashing the incoming token
```

---

### A03: Injection

Never interpolate user input into SQL, shell commands, RegExp, or eval.

```typescript
// ❌ SQL injection
const users = await db.$queryRaw(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ Prisma parameterized queries (injection-safe by default)
const users = await db.user.findMany({ where: { email } });

// ✅ $queryRaw with tagged template literal (safe)
const users = await db.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ❌ eval() with user data — remote code execution
eval(req.body.formula);

// ❌ RegExp from user input — ReDoS attack
new RegExp(req.query.pattern);
```

**ESLint rules:**
- `security/detect-eval-with-expression: error`
- `security/detect-unsafe-regex: error`
- `security/detect-non-literal-regexp: warn`
- `no-eval: error` (backend config)
- `no-new-func: error` (backend config)

**Input validation (all routes):**
```typescript
// ✅ Zod schema validates BEFORE handler logic
const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[\w\s-]+$/),
  role: z.enum(['user', 'admin']),
});

fastify.post('/users', {
  schema: { body: zodToJsonSchema(createUserSchema) },
  handler: async (req) => {
    const input = createUserSchema.parse(req.body); // validated
    return userService.create(input);
  },
});
```

---

### A04: Insecure Design

Never design systems that assume trust. Every boundary crossing requires authentication and authorization.

**Environment variables — validate at startup:**
```typescript
// ✅ Crash at startup if required config is missing — fail fast, fail loud
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  BCRYPT_ROUNDS: z.coerce.number().min(12),
});

const env = envSchema.parse(process.env);
export { env };

// ❌ Silently use undefined
const secret = process.env.JWT_SECRET; // could be undefined
```

**ESLint rules:**
- `no-secrets/no-secrets: error` — catches hardcoded credentials
- `security/detect-buffer-noassert: error`

---

### A05: Security Misconfiguration

Use security-hardening middleware on every Fastify app.

```typescript
// ✅ Required on every Fastify app
import fastifyHelmet from '@fastify/helmet';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import fastifyRateLimit from '@fastify/rate-limit';

await app.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],         // no unsafe-eval, no unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],  // Next.js requires this; document it
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL],
      frameAncestors: ["'none'"],    // prevents clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});

await app.register(fastifyCsrfProtection);
await app.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
});
```

---

### A06: Vulnerable Components

Before adding any dependency:
1. Check `pnpm audit` (run `pnpm audit --audit-level=high`)
2. Check the package's last publish date and maintenance status
3. Verify the package is necessary — prefer native Node.js APIs

**In CI** — `pnpm audit --audit-level=critical` blocks merges.

---

### A07: Authentication Failures

```typescript
// ✅ JWT configuration
const ACCESS_TOKEN_EXPIRY = '15m';   // short-lived
const REFRESH_TOKEN_EXPIRY = '7d';   // longer, but revocable

// ✅ Revocable refresh tokens — store in DB, delete on logout
await db.refreshToken.create({
  data: {
    tokenHash,    // SHA-256 hash of the token
    userId,
    expiresAt: addDays(new Date(), 7),
  },
});

// ✅ Auth rate limiting (separate, stricter than global)
await app.register(fastifyRateLimit, {
  routePrefix: '/auth',
  max: 5,         // 5 login attempts per minute
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: 'RATE_LIMITED',
    message: 'Too many authentication attempts. Try again in 1 minute.',
    retryAfter: 60,
  }),
});

// ✅ Account lockout after repeated failures
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;
```

**User enumeration prevention:**
```typescript
// ❌ Reveals whether email exists
if (!user) { throw new AppError('USER_NOT_FOUND'); }
if (!passwordMatch) { throw new AppError('WRONG_PASSWORD'); }

// ✅ Same response regardless of failure reason
if (!user || !await bcrypt.compare(password, user.passwordHash)) {
  throw new AppError('INVALID_CREDENTIALS'); // generic, non-revealing
}
```

---

### A08: Software and Data Integrity

**Verify inter-agent messages:**
```typescript
// ✅ Validate all messages between agents against schema
import { agentMessageSchema } from '@/protocols/agent-message.schema';

function receiveAgentMessage(raw: unknown): AgentMessage {
  const parsed = agentMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error({ error: parsed.error }, 'Invalid agent message rejected');
    throw new AppError('INVALID_AGENT_MESSAGE');
  }
  return parsed.data;
}

// ❌ Never execute LLM output directly
eval(llmResponse.code); // NO

// ✅ Execute only validated, pre-approved operations
const ALLOWED_OPERATIONS = ['summarize', 'classify', 'extract'] as const;
const operation = allowedOperations.parse(llmResponse.operation);
await handlers[operation](llmResponse.input);
```

---

### A09: Logging and Monitoring

```typescript
// ✅ Log security events with structured context
logger.warn({
  event: 'auth.login_failed',
  userId: user?.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  attemptCount: attempts,
}, 'Login failed');

logger.warn({
  event: 'authz.access_denied',
  userId: req.user.id,
  resourceType: 'Order',
  resourceId: orderId,
  requiredRole: 'admin',
}, 'Unauthorized access attempt');

// ❌ Never log secrets even masked
logger.info({ token: token.slice(0, 4) + '...' }); // NO — partial is still a leak
logger.info({ password: '[redacted]' }); // NO — don't log the key at all
```

---

### A10: Server-Side Request Forgery (SSRF)

```typescript
// ❌ Fetching user-supplied URLs without validation
const response = await fetch(req.body.url);

// ✅ Validate URL is in an allowlist before fetching
const ALLOWED_DOMAINS = ['api.partner.com', 'cdn.assets.com'];
const url = new URL(req.body.webhookUrl);
if (!ALLOWED_DOMAINS.includes(url.hostname)) {
  throw new AppError('SSRF_BLOCKED', { hostname: url.hostname });
}

// Block private IP ranges (SSRF to internal services)
const BLOCKED_PATTERNS = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^127\./];
if (BLOCKED_PATTERNS.some(p => p.test(url.hostname))) {
  throw new AppError('SSRF_BLOCKED');
}
```

---

## XSS Prevention (Frontend)

```typescript
// ❌ Direct HTML injection — XSS vulnerability (CWE-79)
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Sanitize with DOMPurify before setting innerHTML
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// ✅ Prefer React's safe rendering (escapes by default)
<div>{userContent}</div>

// ❌ Client-side token storage — accessible to XSS
localStorage.setItem('accessToken', token);

// ✅ httpOnly cookies — inaccessible to JavaScript
// Tokens set via Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict
```

**ESLint rules:**
- `no-unsanitized/method: error`
- `no-unsanitized/property: error`

---

## Secrets Management

```typescript
// ❌ Hardcoded secrets — leaked in git history forever
const STRIPE_KEY = 'sk_live_abc123...';
const DB_URL = 'postgresql://user:pass@localhost/db';

// ✅ Environment variables, validated at startup
import { env } from '@/config/env'; // validated Zod schema
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
```

**ESLint rule:** `no-secrets/no-secrets: error` (tolerance: 4.2)

**Required `.env.example`** — document all required variables without values:
```
DATABASE_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
```

---

## AI/Agent-Specific Security (OWASP Agentic Top 10)

1. **Validate all inter-agent messages** against `agent-message.schema.yml` — reject malformed messages
2. **Never execute LLM output directly** — route through an allowlist of approved operations
3. **Log all agent memory reads/writes** — audit trail for agent actions
4. **Isolate agent permissions** — each agent has minimum necessary access; no agent has admin-by-default
5. **Prompt injection defense** — sanitize user content before including in agent prompts
6. **Agent action authorization** — agents must check permissions just like user requests

---

## Forbidden Patterns (ESLint-enforced)

| Pattern | Risk | ESLint Rule |
|---------|------|-------------|
| `eval(userInput)` | Code injection | `security/detect-eval-with-expression` |
| `new Function(str)` | Code injection | `no-new-func` |
| `Math.random()` for tokens | Predictable tokens | `security/detect-pseudoRandomBytes` |
| `token === storedToken` | Timing attack | `security/detect-possible-timing-attacks` |
| `new RegExp(userInput)` | ReDoS | `security/detect-non-literal-regexp` |
| `dangerouslySetInnerHTML={{__html: x}}` | XSS | `no-unsanitized/property` |
| `const SECRET = 'abc123'` | Hardcoded secret | `no-secrets/no-secrets` |
| `process.env.FOO \|\| undefined` | Unchecked env | Code review |
| `as unknown as Foo` | Unsafe type cast | Code review |

---

## Security Self-Review Checklist

Run before marking any task complete:

- [ ] All route inputs validated with Zod schemas
- [ ] All user-owned resources verified against `req.user.id`
- [ ] Role checked before admin/privileged operations
- [ ] Passwords hashed with bcrypt ≥ 12 rounds
- [ ] Tokens compared with `crypto.timingSafeEqual`
- [ ] No secrets hardcoded (no-secrets ESLint rule passing)
- [ ] Auth routes have stricter rate limits (5 req/min)
- [ ] `helmet()` registered on Fastify app
- [ ] No `dangerouslySetInnerHTML` without `DOMPurify.sanitize()`
- [ ] No `localStorage` for auth tokens (use httpOnly cookies)
- [ ] Security events (auth failures, access denied) are logged with context
- [ ] `pnpm audit --audit-level=high` passes before PR
