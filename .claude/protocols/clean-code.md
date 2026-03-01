# Clean Code Protocol — ConnectSW

**Version:** 1.0
**Applies to:** All coding agents (Backend Engineer, Frontend Engineer, Mobile Developer)
**When to read:** Before writing any implementation code
**Enforced by:** `@connectsw/eslint-config` (ESLint rules listed per standard)

---

## Why This Exists

Code review cycles are expensive. Production bugs are more expensive. The fastest path to shipping is writing clean code the first time — code that is easy to read, test, and change.

ConnectSW defines "clean" concretely. These are not aspirational guidelines; they are enforced by ESLint, CI, and Code Review gates.

---

## 1. Naming

Good names eliminate the need for comments. If you need a comment to explain what a variable or function is, rename it.

| What | Convention | Example |
|------|-----------|---------|
| Functions | `verb + noun`, camelCase | `getUserById`, `validateEmailFormat`, `sendVerificationEmail` |
| Classes | PascalCase, noun | `UserRepository`, `EmailVerificationService`, `AuthMiddleware` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS`, `TOKEN_EXPIRY_SECONDS` |
| Booleans | `is/has/can/should` prefix | `isVerified`, `hasPermission`, `canDelete` |
| Arrays/lists | Plural noun | `users`, `pendingJobs`, `validationErrors` |
| Generic params | Never single letter (except `i` in for loops) | ✅ `userId`, ✅ `item` — ❌ `u`, ❌ `x` |

**ESLint:** No direct rule, but `@typescript-eslint/no-explicit-any` and naming patterns are enforced by code review.

---

## 2. Function Design

A function should do ONE thing. If you can describe what a function does using "and", it needs to be split.

```
✅ getUserById(id)           — fetches user by ID
✅ validateUserInput(input)  — validates input against schema
✅ sendWelcomeEmail(user)    — sends welcome email

❌ createUserAndSendEmail(data) — does two things
❌ processAndValidateAndStore() — does three things
```

**Hard limits** (ESLint-enforced):
- Max **50 lines** per function (`max-lines-per-function: 50`)
- Max **4 parameters** (`max-params: 4`) — use a config object for more
- Max **3 nesting levels** (`max-depth: 3`) — prefer early returns

**Early returns (guard clauses):**
```typescript
// ✅ Good — flat, easy to follow
function processOrder(order: Order): void {
  if (!order.userId) { throw new AppError('MISSING_USER'); }
  if (!order.items.length) { throw new AppError('EMPTY_ORDER'); }
  if (order.total <= 0) { throw new AppError('INVALID_TOTAL'); }

  // happy path here
}

// ❌ Bad — deeply nested
function processOrder(order: Order): void {
  if (order.userId) {
    if (order.items.length) {
      if (order.total > 0) {
        // happy path buried in nesting
      }
    }
  }
}
```

---

## 3. Error Handling

Every error must be handled explicitly. Silent failures cause production incidents.

**Never swallow errors:**
```typescript
// ❌ Silent failure — hides bugs
try {
  await processPayment(order);
} catch (e) {}

// ✅ Logged with context
try {
  await processPayment(order);
} catch (error) {
  logger.error({ error, orderId: order.id }, 'Payment processing failed');
  throw new AppError('PAYMENT_FAILED', { cause: error });
}
```

**Typed error classes:**
```typescript
// ✅ Structured errors with context
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'AppError';
  }
}

// Usage
throw new AppError('USER_NOT_FOUND', { userId: id });
throw new AppError('RATE_LIMITED', { ip: req.ip, limit: 5 });
```

**Fail closed on security errors:**
```typescript
// ✅ If auth check throws, access is DENIED — never granted
try {
  await verifyToken(token);
} catch (error) {
  logger.warn({ error }, 'Token verification failed');
  throw new AppError('UNAUTHORIZED'); // deny, never grant
}
```

---

## 4. Complexity

Keep code simple enough that a new team member can understand it in 30 seconds.

**Cyclomatic Complexity ≤ 10** (ESLint `complexity: 10`):
- Every `if`, `else`, `&&`, `||`, `for`, `while`, `case` adds 1 to complexity
- At complexity 10, break the function into smaller pieces

**Block nesting ≤ 3 levels** (ESLint `max-depth: 3`):
```typescript
// ✅ max depth = 2
function findActiveAdmins(users: User[]): User[] {
  return users.filter(user => user.isAdmin && user.isActive);
}

// ❌ depth = 4 (function → if → for → if)
function findActiveAdmins(users: User[]): User[] {
  if (users) {
    const result = [];
    for (const user of users) {
      if (user.isAdmin) {
        if (user.isActive) { result.push(user); }
      }
    }
    return result;
  }
}
```

---

## 5. No Dead Code

Dead code confuses readers and increases maintenance burden.

**Before merging, remove:**
- Commented-out code blocks
- Unused imports (`@typescript-eslint/no-unused-vars`)
- TODO/FIXME comments — log as GitHub Issue instead, link the issue number
- Unreachable code after `return`/`throw`
- Unused variables and parameters

```typescript
// ❌ Don't commit this
// const oldApproach = await legacyGetUser(id); // trying old way
import { unusedHelper } from './helpers'; // TODO: remove later

// ✅ If you need to track future work:
// Issue: https://github.com/org/repo/issues/456
```

---

## 6. File Size

Max **300 lines per file** (ESLint `max-lines: 300`).

Large files signal missing layer separation. Split by responsibility:

```
route handler    → validates input, calls service, returns response
service          → orchestrates business logic, calls repositories
repository       → database queries only
```

```
❌ user-route.ts  (800 lines — validation + business + DB + email all in one)

✅ routes/users.ts        (route registration, input validation)
✅ services/user.ts       (business logic, orchestration)
✅ repositories/user.ts   (database queries)
✅ email/user-emails.ts   (email sending)
```

---

## 7. Imports

**No barrel imports** — import directly from the file that defines the export:

```typescript
// ❌ Barrel import (hides dependencies, creates circular risk)
import { UserService, AuthService } from '../../services';

// ✅ Direct named import
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
```

**Absolute paths via tsconfig** — no `../../..` chains:
```typescript
// ❌ Hard to refactor
import { AppError } from '../../../shared/errors';

// ✅ Configured in tsconfig.json paths
import { AppError } from '@/shared/errors';
```

---

## 8. Type Safety

TypeScript's value is catching bugs at compile time. Don't throw it away.

```typescript
// ❌ Defeats TypeScript
function process(data: any): any { ... }

// ❌ Type assertion without justification
const user = response as User;

// ✅ Proper typing
function process(data: UserInput): ProcessedUser { ... }

// ✅ Type assertion with justification comment (when truly needed)
// We validate the shape with Zod before this assertion — safe
const user = validatedData as User;
```

**Rules enforced:**
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/no-non-null-assertion: warn`
- `strict: true` in tsconfig (strict null checks, no implicit any)

---

## 9. SOLID Principles

| Principle | What it means in practice |
|-----------|--------------------------|
| **S** — Single Responsibility | One class/function = one reason to change |
| **O** — Open/Closed | Extend via interfaces, not by modifying existing code |
| **L** — Liskov Substitution | Subclasses must work wherever the base class is used |
| **I** — Interface Segregation | Small focused interfaces, not one large blob |
| **D** — Dependency Inversion | Depend on abstractions (interfaces), not concrete implementations |

**Most common violation: SRP**
```typescript
// ❌ UserService does email, auth, profile, AND billing — split it
class UserService {
  registerUser() { /* creates user + sends email + charges payment */ }
}

// ✅ Each service owns one domain
class RegistrationService { registerUser() { /* creates user */ } }
class EmailService { sendWelcome() { /* sends email */ } }
class BillingService { initializeFreeTrialPlan() { /* billing */ } }
```

---

## 10. Self-Documenting Code

Comments explain **WHY**, not **WHAT**. If you need a comment to explain what the code does, the code needs to be clearer.

```typescript
// ❌ Comment explains WHAT (obvious from code)
// Increment the counter by 1
count++;

// ❌ Comment patches a bad name
// Get the thing
const x = getUser(id);

// ✅ Comment explains WHY (not obvious from code)
// Use timing-safe comparison to prevent timing attacks on token verification.
// Regular === comparison leaks timing information attackers can exploit.
const isValid = crypto.timingSafeEqual(
  Buffer.from(providedToken),
  Buffer.from(storedToken),
);
```

---

## Self-Review Checklist

Run this before marking any task complete:

- [ ] No function exceeds 50 lines
- [ ] No file exceeds 300 lines
- [ ] Cyclomatic complexity ≤ 10 (ESLint `complexity` rule)
- [ ] No nesting deeper than 3 levels
- [ ] No `any` types
- [ ] All promises awaited or caught
- [ ] No dead code (commented-out blocks, unreachable returns, unused imports)
- [ ] Error handling uses typed `AppError` classes with context
- [ ] All Zod schemas validate before handler logic runs
- [ ] No hardcoded values (secrets, URLs, timeouts) — use env vars
- [ ] `pnpm run lint` returns 0 errors
- [ ] `pnpm run typecheck` returns 0 errors
