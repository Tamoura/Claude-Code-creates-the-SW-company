# API Contract

**Product**: Basic Calculator
**Version**: 1.0 (MVP)
**Status**: N/A - No API

---

## Overview

The Basic Calculator is a **client-side only** application with **no backend API**.

All computation happens in the browser using JavaScript. There are no server-side endpoints, no database queries, and no external API calls.

---

## Why No API?

The MVP requirements specify:
- Client-side only execution
- No user authentication
- No data persistence
- Pure calculation tool

Therefore, an API would add unnecessary complexity with no benefit.

---

## Client-Side Architecture

### Pure Functions (Business Logic)

All calculation logic is implemented as pure TypeScript functions in `src/calculators/`:

#### `calculate(a: number, b: number, operation: Operation): number`

Performs arithmetic calculation.

**Parameters**:
- `a` (number): First operand
- `b` (number): Second operand
- `operation` ('+' | '-' | '*' | '/'): Operation to perform

**Returns**: `number` - Result of calculation

**Throws**: `Error` - If division by zero

**Example**:
```typescript
import { calculate } from './calculators/arithmetic';

const result = calculate(5, 3, '+'); // Returns 8
```

#### `roundToPrecision(num: number, decimals?: number): number`

Rounds a number to eliminate floating-point precision errors.

**Parameters**:
- `num` (number): Number to round
- `decimals` (number, optional): Decimal places (default: 10)

**Returns**: `number` - Rounded number

**Example**:
```typescript
import { roundToPrecision } from './calculators/precision';

const result = roundToPrecision(0.1 + 0.2); // Returns 0.3 (not 0.30000000000000004)
```

#### `formatDisplay(num: number): string`

Formats a number for display (removes trailing zeros).

**Parameters**:
- `num` (number): Number to format

**Returns**: `string` - Formatted string

**Example**:
```typescript
import { formatDisplay } from './calculators/precision';

const display = formatDisplay(3.00); // Returns "3" (not "3.00")
```

---

## Future Considerations

If we add backend features in Phase 2 (e.g., user accounts, calculation history), we would create a RESTful API with these potential endpoints:

### Potential Future Endpoints

**Not implemented in MVP - for reference only**

#### `POST /api/v1/calculations`
Save a calculation to history (requires authentication)

**Request**:
```json
{
  "expression": "5 + 3",
  "result": "8"
}
```

**Response**:
```json
{
  "id": "calc_123",
  "expression": "5 + 3",
  "result": "8",
  "timestamp": "2026-01-27T12:00:00Z"
}
```

#### `GET /api/v1/calculations`
Retrieve calculation history (requires authentication)

**Response**:
```json
{
  "calculations": [
    {
      "id": "calc_123",
      "expression": "5 + 3",
      "result": "8",
      "timestamp": "2026-01-27T12:00:00Z"
    }
  ]
}
```

---

## Technology Stack (If API Needed in Future)

If we add a backend API:
- **Framework**: Fastify (company standard)
- **Language**: TypeScript
- **Database**: PostgreSQL (if persistent storage needed)
- **ORM**: Prisma
- **Authentication**: Clerk or NextAuth.js
- **Deployment**: Vercel or Railway

See [Company Standards](/.claude/CLAUDE.md) for full tech stack decisions.

---

**Document Status**: N/A - No API in MVP
**Last Updated**: 2026-01-27
**Next Review**: When backend features are added (Phase 2 or later)
