# ADR-002: Decimal Precision Strategy

**Status**: Accepted
**Date**: 2026-01-27
**Decision Makers**: Architect Agent
**Context**: Basic Calculator Web App

---

## Context

JavaScript has well-known floating-point precision issues that can cause incorrect results in arithmetic operations:

```javascript
0.1 + 0.2 = 0.30000000000000004  // Not 0.3!
0.1 + 0.7 = 0.7999999999999999   // Not 0.8!
9.7 * 100 = 969.9999999999999    // Not 970!
```

These errors are **unacceptable** in a calculator application. Users expect:
- `0.1 + 0.2 = 0.3` (not 0.30000000000000004)
- `10 / 3 = 3.3333333333` (rounded to 10 decimal places)
- `0.1 * 3 = 0.3` (not 0.30000000000000004)

The PRD specifies:
- Support decimal numbers up to 10 decimal places
- Handle floating-point precision issues
- Display results correctly formatted

---

## Decision

### Use Custom Rounding with Native JavaScript (No External Library)

**Choice**: Implement custom decimal formatting and rounding using native JavaScript `Number.toFixed()` and `Math.round()`.

**Alternatives Considered**:

| Option | Pros | Cons | Bundle Size | Why Not Chosen |
|--------|------|------|-------------|----------------|
| **Custom Rounding** ⭐ | Zero dependencies, full control, tiny code | Requires careful implementation | 0 KB | **CHOSEN** |
| decimal.js | Perfect precision, comprehensive | Heavy library, overkill for basic calc | ~32 KB | Too heavy for simple calculator |
| big.js | Lighter than decimal.js | Still adds 6KB for basic operations | ~6 KB | Unnecessary for basic arithmetic |
| bignumber.js | Well-tested | 26KB, more features than needed | ~26 KB | Overkill |
| Native BigInt | Built-in, zero bundle | Only integers, can't do decimals | 0 KB | Can't handle decimals (e.g., 0.1 + 0.2) |

**Decision Rationale**:
1. **Bundle Size**: PRD requires < 100KB total. decimal.js alone is 32KB (30% of budget)
2. **Scope**: Basic calculator only needs +, -, *, / with reasonable precision
3. **Performance**: Native operations are faster than library abstractions
4. **Simplicity**: Custom solution is ~20 lines of code vs 32KB library
5. **Good Enough**: Rounding to 10 decimal places solves 99.9% of precision issues

---

## Implementation Strategy

### 1. Round Results to 10 Decimal Places

```typescript
// src/calculators/precision.ts

/**
 * Rounds a number to specified decimal places, eliminating floating point errors
 * @param num - The number to round
 * @param decimals - Number of decimal places (default: 10)
 * @returns Rounded number
 */
export function roundToPrecision(num: number, decimals: number = 10): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}
```

**Example**:
```typescript
roundToPrecision(0.1 + 0.2)  // Returns 0.3 (not 0.30000000000000004)
roundToPrecision(9.7 * 100)  // Returns 970 (not 969.9999999999999)
```

### 2. Format Display Values

```typescript
/**
 * Formats a number for display, removing trailing zeros
 * @param num - The number to format
 * @returns Formatted string
 */
export function formatDisplay(num: number): string {
  // Round to 10 decimal places
  const rounded = roundToPrecision(num);

  // Convert to string and remove trailing zeros
  let str = rounded.toString();

  // If it has a decimal point, remove trailing zeros
  if (str.includes('.')) {
    str = str.replace(/\.?0+$/, '');
  }

  return str;
}
```

**Examples**:
```typescript
formatDisplay(3.14159265359)  // "3.1415926536" (10 decimals)
formatDisplay(3.00)           // "3" (trailing zeros removed)
formatDisplay(3.10)           // "3.1" (trailing zero removed)
formatDisplay(0.3333333333)   // "0.3333333333" (exactly 10 decimals)
```

### 3. Handle Division by Zero

```typescript
/**
 * Performs division with error handling
 * @param a - Dividend
 * @param b - Divisor
 * @returns Result or throws error
 */
export function safeDivide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}
```

### 4. Apply to All Operations

```typescript
// src/calculators/arithmetic.ts

import { roundToPrecision, safeDivide } from './precision';

export function calculate(
  a: number,
  b: number,
  operation: '+' | '-' | '*' | '/'
): number {
  let result: number;

  switch (operation) {
    case '+':
      result = a + b;
      break;
    case '-':
      result = a - b;
      break;
    case '*':
      result = a * b;
      break;
    case '/':
      result = safeDivide(a, b);
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Round result to eliminate floating point errors
  return roundToPrecision(result);
}
```

---

## Edge Cases Handled

| Case | Input | Expected Output | How We Handle |
|------|-------|-----------------|---------------|
| Classic 0.1 + 0.2 | `0.1 + 0.2` | `0.3` | `roundToPrecision(0.30000000000000004) → 0.3` |
| Division result | `10 / 3` | `3.3333333333` | Rounded to 10 decimals |
| Multiplication precision | `0.1 * 3` | `0.3` | `roundToPrecision(0.30000000000000004) → 0.3` |
| Trailing zeros | `3.00` | `3` | `formatDisplay()` removes trailing zeros |
| Division by zero | `5 / 0` | Error | `safeDivide()` throws clear error |
| Very small numbers | `0.0000000001 + 0.0000000001` | `0.0000000002` | Works within 10 decimal precision |
| Very large numbers | `999999999999 * 2` | `1999999999998` | JavaScript handles up to 2^53 safely |

---

## Limitations

### What This Solution Does NOT Handle

1. **Numbers beyond ±2^53**: JavaScript `Number` is limited by IEEE 754 double precision
   - Max safe integer: 9,007,199,254,740,991
   - Beyond this, use BigInt (future consideration)

2. **More than 10 decimal places**: Will round to 10 decimals
   - Example: `1/3 = 0.3333333333` (not infinite 0.333...)
   - This is acceptable per PRD requirements

3. **Irrational numbers**: π, √2, etc. not in MVP scope
   - Future: Scientific calculator mode could add these

4. **Very small numbers**: Numbers smaller than 1e-10 may round to 0
   - Example: `0.00000000001 + 0.00000000001 = 0` (rounds to 0)
   - Acceptable for basic calculator use case

---

## Testing Strategy

### Unit Tests (100% Coverage Required)

```typescript
// src/calculators/precision.test.ts

describe('roundToPrecision', () => {
  it('should fix 0.1 + 0.2 precision error', () => {
    expect(roundToPrecision(0.1 + 0.2)).toBe(0.3);
  });

  it('should round to 10 decimal places', () => {
    expect(roundToPrecision(1/3)).toBe(0.3333333333);
  });

  it('should handle negative numbers', () => {
    expect(roundToPrecision(-0.1 - 0.2)).toBe(-0.3);
  });
});

describe('formatDisplay', () => {
  it('should remove trailing zeros', () => {
    expect(formatDisplay(3.00)).toBe('3');
    expect(formatDisplay(3.10)).toBe('3.1');
  });

  it('should preserve significant decimals', () => {
    expect(formatDisplay(3.14)).toBe('3.14');
  });
});

describe('calculate', () => {
  it('should handle classic precision errors', () => {
    expect(calculate(0.1, 0.2, '+')).toBe(0.3);
    expect(calculate(0.1, 3, '*')).toBe(0.3);
  });

  it('should throw on division by zero', () => {
    expect(() => calculate(5, 0, '/')).toThrow('Cannot divide by zero');
  });
});
```

### E2E Tests

```typescript
// e2e/calculator.spec.ts

test('displays 0.3 for 0.1 + 0.2', async ({ page }) => {
  await page.goto('/');
  await page.click('text=0');
  await page.click('text=.');
  await page.click('text=1');
  await page.click('text=+');
  await page.click('text=0');
  await page.click('text=.');
  await page.click('text=2');
  await page.click('text==');

  await expect(page.locator('[data-testid="display"]')).toHaveText('0.3');
});
```

---

## Consequences

### Positive
- **Zero Dependencies**: No external library needed (saves ~32KB)
- **Sufficient Precision**: 10 decimal places covers 99.9% of use cases
- **Fast**: Native JavaScript operations
- **Maintainable**: Simple, understandable code (~50 lines total)
- **Testable**: Easy to write comprehensive unit tests

### Negative
- **Not Perfect**: Cannot represent irrational numbers infinitely
- **Edge Cases**: Very large/small numbers may lose precision beyond safe integer range
- **Custom Code**: Need to maintain our own precision logic

### Neutral
- **Good Enough**: Acceptable trade-off for a basic calculator
- **Upgradeable**: Can add decimal.js later if needed (e.g., for scientific mode)

---

## Future Considerations

### Phase 2: If We Need More Precision

If we add advanced features (scientific calculator, financial calculations):
- Consider adding `decimal.js` or `big.js`
- Make it opt-in (code-split) to keep basic calculator light
- Example: `import('./decimal.js').then(...)` for advanced mode only

### Alternative: Web Worker for Heavy Calculations

If calculation performance becomes an issue:
- Move calculation logic to Web Worker
- Keeps UI responsive during complex operations
- Not needed for basic arithmetic (operations take < 1ms)

---

## References

- [MDN: Number.EPSILON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON)
- [IEEE 754 Floating Point](https://en.wikipedia.org/wiki/IEEE_754)
- [decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [Stack Overflow: JavaScript Floating Point Precision](https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript)
