# Basic Calculator - System Architecture

**Product**: Basic Calculator
**Version**: 1.0 (MVP)
**Status**: Approved
**Last Updated**: 2026-01-27

---

## 1. Overview

The Basic Calculator is a **client-side only** web application that performs basic arithmetic operations (addition, subtraction, multiplication, division). It requires no backend server, no database, and no user authentication.

**Key Characteristics**:
- Pure frontend application (React + TypeScript)
- Zero backend infrastructure
- No data persistence
- Accessible (WCAG 2.1 AA compliant)
- Mobile-responsive
- Offline-capable after initial load

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                    User                         │
│              (Browser Client)                   │
└───────────────────┬─────────────────────────────┘
                    │
                    │ HTTPS
                    │
┌───────────────────▼─────────────────────────────┐
│              Static CDN/Hosting                 │
│         (Vercel / Netlify / GitHub Pages)       │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │   index.html (5KB)                     │    │
│  │   + main.js (bundled React app, 50KB)  │    │
│  │   + styles.css (10KB)                   │    │
│  └────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘

All computation happens in browser (JavaScript):
┌──────────────────────────────────────────────────┐
│           Browser JavaScript Engine              │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │  React Components                    │       │
│  │  - Calculator (state management)     │       │
│  │  - Display (output)                  │       │
│  │  - ButtonGrid (input)                │       │
│  └─────────────┬────────────────────────┘       │
│                │                                 │
│                │ calls                           │
│                ▼                                 │
│  ┌──────────────────────────────────────┐       │
│  │  Pure Functions (calculators/)       │       │
│  │  - arithmetic.ts (calculate)         │       │
│  │  - precision.ts (rounding)           │       │
│  └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘

No network calls after initial page load
```

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | React | 18.2+ | Component architecture, state management |
| **Build Tool** | Vite | 5.x | Fast dev server, optimized builds |
| **Language** | TypeScript | 5.x | Type safety for calculations |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS, responsive design |
| **Testing** | Vitest + React Testing Library | Latest | Unit and integration tests |
| **E2E Testing** | Playwright | 1.41+ | Cross-browser end-to-end testing |
| **Linting** | ESLint + Prettier | Latest | Code quality and formatting |

### Backend

**None** - Client-side only application

### Database

**None** - No data persistence in MVP

### Deployment

| Environment | Platform | URL |
|-------------|----------|-----|
| Production | TBD (Vercel / Netlify / GitHub Pages) | TBD |
| Preview | TBD | TBD |

---

## 4. Component Architecture

### Component Hierarchy

```
App
 └── Calculator (main component)
      ├── Display (output component)
      │    └── displays: currentValue, previousValue, operation
      │
      └── ButtonGrid (input component)
           ├── NumberButton (0-9, .)
           ├── OperatorButton (+, -, *, /)
           ├── EqualsButton (=)
           └── ClearButton (C, AC)
```

### Component Responsibilities

#### 1. `App.tsx`
- Root component
- Renders Calculator component
- Global styles and layout

#### 2. `Calculator.tsx` (Smart Component)
- **State Management**: Manages all calculator state
  ```typescript
  interface CalculatorState {
    currentValue: string;
    previousValue: string | null;
    operation: '+' | '-' | '*' | '/' | null;
    shouldResetDisplay: boolean;
  }
  ```
- **Event Handlers**: Button clicks, keyboard input
- **Business Logic**: Calls calculation functions
- **Error Handling**: Division by zero, invalid input

#### 3. `Display.tsx` (Presentational Component)
- Displays current value
- Shows previous value and operation (e.g., "5 +")
- Accessible (aria-live region for screen readers)

#### 4. `ButtonGrid.tsx` (Presentational Component)
- Layout of calculator buttons (4x5 grid)
- Renders Button components
- Responsive sizing (larger buttons on mobile)

#### 5. `Button.tsx` (Reusable Component)
- Generic button component
- Props: `value`, `onClick`, `ariaLabel`, `variant` (number/operator/equals/clear)
- Accessible (ARIA labels, keyboard support)

---

## 5. State Management

### Strategy: React `useState` (No Global State Library)

**Rationale**: The calculator has minimal state contained in one component. No need for Redux/Zustand.

### State Shape

```typescript
// src/components/Calculator.tsx

interface CalculatorState {
  currentValue: string;        // What user is typing or result (e.g., "42.5")
  previousValue: string | null; // Previous operand (e.g., "10")
  operation: '+' | '-' | '*' | '/' | null; // Current operation
  shouldResetDisplay: boolean;  // Reset display on next number input
}

const [state, setState] = useState<CalculatorState>({
  currentValue: '0',
  previousValue: null,
  operation: null,
  shouldResetDisplay: false,
});
```

### State Transitions

```
User Action                 State Change
─────────────────────────────────────────────────────────────
Press "5"                → currentValue = "5"
Press "+"                → previousValue = "5", operation = "+", shouldResetDisplay = true
Press "3"                → currentValue = "3"
Press "="                → calculate(5, 3, "+") → currentValue = "8", operation = null
Press "+"                → previousValue = "8", operation = "+", shouldResetDisplay = true
Press "2"                → currentValue = "2"
Press "="                → calculate(8, 2, "+") → currentValue = "10"
Press "C"                → Reset to initial state
Press "5" "/" "0" "="    → Error state, display "Error: Cannot divide by zero"
```

---

## 6. Calculation Logic (Pure Functions)

### Design Pattern: Separate Business Logic from UI

**Location**: `src/calculators/` directory

**Rationale**:
- Testable without React
- Reusable across components
- Clear separation of concerns
- Follows PATTERN-006 from company knowledge

### Files

#### `src/calculators/arithmetic.ts`

```typescript
/**
 * Performs arithmetic calculation
 * @param a - First operand
 * @param b - Second operand
 * @param operation - Operation to perform
 * @returns Result of calculation
 * @throws Error if division by zero
 */
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
      if (b === 0) {
        throw new Error('Cannot divide by zero');
      }
      result = a / b;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Round to eliminate floating-point errors
  return roundToPrecision(result);
}
```

#### `src/calculators/precision.ts`

```typescript
/**
 * Rounds a number to eliminate JavaScript floating-point errors
 * @param num - Number to round
 * @param decimals - Decimal places (default: 10)
 * @returns Rounded number
 */
export function roundToPrecision(num: number, decimals: number = 10): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Formats a number for display
 * @param num - Number to format
 * @returns Formatted string (removes trailing zeros)
 */
export function formatDisplay(num: number): string {
  const rounded = roundToPrecision(num);
  let str = rounded.toString();

  // Remove trailing zeros after decimal point
  if (str.includes('.')) {
    str = str.replace(/\.?0+$/, '');
  }

  return str;
}
```

**See ADR-002** for full decimal precision strategy.

---

## 7. Accessibility Architecture

### WCAG 2.1 AA Compliance

**Requirement**: All components must meet WCAG 2.1 Level AA standards

#### Key Accessibility Features

1. **Semantic HTML**
   - Use `<button>` for all interactive elements
   - Use `<output>` for calculator display
   - Proper heading hierarchy

2. **ARIA Labels**
   - All buttons have descriptive `aria-label` attributes
   - Display uses `aria-live="polite"` for screen reader announcements
   - Errors use `aria-live="assertive"` for immediate announcements

3. **Keyboard Navigation**
   - Full keyboard operability (0-9, +, -, *, /, Enter, Escape)
   - Visible focus indicators (3:1 contrast ratio)
   - Logical tab order

4. **Touch Targets**
   - Minimum 44x44px on mobile (exceeds WCAG minimum)
   - 56px actual implementation

5. **Color Contrast**
   - All text meets 4.5:1 minimum contrast ratio
   - Focus indicators meet 3:1 contrast ratio

**See ADR-003** for complete accessibility architecture.

---

## 8. Security Considerations

### Threat Model

Since this is a client-side only calculator with no backend:

| Threat | Risk Level | Mitigation |
|--------|------------|------------|
| XSS (Cross-Site Scripting) | Low | React escapes all output by default, no `dangerouslySetInnerHTML` |
| CSRF | None | No backend, no authentication, no state modification on server |
| SQL Injection | None | No database |
| Data Breach | None | No data storage |
| Man-in-the-Middle | Low | Serve over HTTPS only |

### Security Best Practices

1. **HTTPS Only**: Always serve over HTTPS (enforced by CDN)
2. **Content Security Policy (CSP)**: Prevent inline scripts
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
   ```
3. **No Sensitive Data**: No user data, no cookies, no localStorage in MVP
4. **Dependency Scanning**: Regular `npm audit` to check for vulnerabilities
5. **Subresource Integrity (SRI)**: If loading external scripts (we don't in MVP)

---

## 9. Performance Architecture

### Performance Budget

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Initial Load** | < 1 second on 3G | Lighthouse Performance score > 90 |
| **Bundle Size** | < 100KB (gzipped) | Webpack Bundle Analyzer |
| **Calculation** | < 100ms | Unit test timing |
| **Button Feedback** | < 50ms | Visual feedback on click |

### Optimization Strategies

1. **Code Splitting**: Not needed (single page, small bundle)
2. **Tree Shaking**: Vite automatically removes unused code
3. **Minification**: Vite minifies with Terser in production
4. **Asset Optimization**:
   - No images in MVP (CSS-only design)
   - Inline critical CSS
   - Use system fonts (no web fonts)

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined, // No code splitting needed
      },
    },
  },
});
```

---

## 10. Testing Architecture

### Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Testing Pyramid                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  E2E (Playwright)                       │
│              ┌─────────────────────┐                    │
│              │  5-10 critical      │  Slow, expensive   │
│              │  user flows         │                    │
│              └─────────────────────┘                    │
│                                                         │
│            Integration (Vitest + RTL)                   │
│         ┌────────────────────────────┐                  │
│         │  Component interactions   │  Medium speed    │
│         │  with real calculation    │                  │
│         │  functions                │                  │
│         └────────────────────────────┘                  │
│                                                         │
│              Unit Tests (Vitest)                        │
│    ┌──────────────────────────────────────┐            │
│    │  Pure functions (calculate, round,   │  Fast      │
│    │  format), utility functions          │            │
│    │  Target: 100% coverage               │            │
│    └──────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Test Coverage Requirements

| Type | Location | Coverage Target | Purpose |
|------|----------|-----------------|---------|
| **Unit** | `src/**/*.test.ts` | 100% for pure functions | Test calculation logic in isolation |
| **Integration** | `src/**/*.test.tsx` | 80%+ for components | Test component interactions |
| **E2E** | `e2e/**/*.spec.ts` | 5-10 critical flows | Test real user workflows |

### Key Test Cases

#### Unit Tests (Pure Functions)
```typescript
// src/calculators/arithmetic.test.ts
describe('calculate', () => {
  it('should add two numbers correctly', () => {
    expect(calculate(5, 3, '+')).toBe(8);
  });

  it('should handle floating point precision', () => {
    expect(calculate(0.1, 0.2, '+')).toBe(0.3); // Not 0.30000000000000004
  });

  it('should throw error on division by zero', () => {
    expect(() => calculate(5, 0, '/')).toThrow('Cannot divide by zero');
  });
});
```

#### Integration Tests (Components)
```typescript
// src/components/Calculator.test.tsx
describe('Calculator', () => {
  it('should calculate 5 + 3 = 8', async () => {
    render(<Calculator />);

    await userEvent.click(screen.getByLabelText('Five'));
    await userEvent.click(screen.getByLabelText('Plus'));
    await userEvent.click(screen.getByLabelText('Three'));
    await userEvent.click(screen.getByLabelText('Equals'));

    expect(screen.getByRole('status')).toHaveTextContent('8');
  });
});
```

#### E2E Tests (Playwright)
```typescript
// e2e/calculator.spec.ts
test('user can perform basic calculation', async ({ page }) => {
  await page.goto('/');

  await page.click('text=5');
  await page.click('text=+');
  await page.click('text=3');
  await page.click('text==');

  await expect(page.locator('[data-testid="display"]')).toHaveText('8');
});

test('keyboard shortcuts work', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.type('5+3');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-testid="display"]')).toHaveText('8');
});
```

---

## 11. Deployment Architecture

### Hosting Options

| Platform | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Vercel** | Easy deployment, auto-preview, free tier | None for this use case | ⭐ Recommended |
| Netlify | Similar to Vercel, good free tier | Slightly slower builds | Alternative |
| GitHub Pages | Free, simple | Manual deployment | For demo only |
| AWS S3 + CloudFront | Full control, cheap | More setup required | If already on AWS |

### Deployment Pipeline

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   Git Push │────►│ GitHub     │────►│ Automated  │────►│ Production │
│   to main  │     │ Actions    │     │ Tests      │     │ Deploy     │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
                         │                   │
                         │                   ├─► Unit Tests
                         │                   ├─► E2E Tests
                         │                   └─► Accessibility Tests
                         │
                         └─► Build (Vite)
                              ├─► Minify JS
                              ├─► Purge CSS
                              └─► Generate sourcemaps
```

### Environment Variables

None needed for MVP (client-side only, no API keys)

---

## 12. Browser Compatibility

### Target Browsers

```json
// package.json browserslist
"browserslist": [
  "last 2 Chrome versions",
  "last 2 Firefox versions",
  "last 2 Safari versions",
  "last 2 Edge versions",
  "iOS >= 14",
  "Android >= 90"
]
```

### Feature Detection

All features used are widely supported:
- ES2020 (native in all modern browsers)
- CSS Grid (supported since 2017)
- Flexbox (supported since 2015)
- CSS Custom Properties (supported since 2018)

**No polyfills needed** for target browsers.

---

## 13. Scalability Considerations

### Current Scale
- **Users**: Unlimited (static hosting)
- **Requests**: Unlimited (CDN caching)
- **Cost**: Near-zero (static files)

### Future Scale (If Adding Features)

If we add backend features (e.g., calculation history, user accounts):
1. **API**: Fastify backend
2. **Database**: PostgreSQL
3. **Auth**: Clerk or NextAuth.js
4. **Hosting**: Migrate to Next.js for SSR

**Note**: MVP is client-only, so these are not currently needed.

---

## 14. Monitoring and Observability

### MVP Monitoring

**Client-Side Error Tracking**:
- Option 1: Sentry (free tier: 5K events/month)
- Option 2: LogRocket (session replay)
- Option 3: None (acceptable for MVP)

**Recommendation**: None for MVP, add Sentry in Phase 2 if needed.

### Performance Monitoring

- **Lighthouse CI**: Run on each PR to check performance
- **WebPageTest**: Manual testing for 3G load times
- **Real User Monitoring (RUM)**: Not needed for MVP

---

## 15. Future Architecture Considerations

### Phase 2 Enhancements

If we add these features, architecture changes required:

| Feature | Architecture Impact |
|---------|---------------------|
| **Calculation History** | Add localStorage, state management for history |
| **Dark Mode** | Add Tailwind dark mode, user preference storage |
| **Scientific Calculator** | More complex state, consider decimal.js for precision |
| **Multi-Calculator Tabs** | Global state (Zustand), more complex routing |
| **User Accounts** | Add backend (Fastify), database (PostgreSQL), auth (Clerk) |
| **PWA (Offline)** | Add service worker, manifest.json, caching strategy |

**Current Decision**: Keep it simple for MVP, add complexity only when needed.

---

## 16. References

### Architecture Decision Records (ADRs)
- [ADR-001: Tech Stack Selection](/products/basic-calculator/docs/ADRs/ADR-001-tech-stack.md)
- [ADR-002: Decimal Precision Strategy](/products/basic-calculator/docs/ADRs/ADR-002-decimal-precision.md)
- [ADR-003: Accessibility-First Design](/products/basic-calculator/docs/ADRs/ADR-003-accessibility-first.md)

### External Documentation
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs](https://developer.mozilla.org/)

### Company Standards
- [ConnectSW Coding Standards](/.claude/CLAUDE.md)
- [Reusable Components Guide](/.claude/architecture/reusable-components.md)
- [Company Knowledge Base](/.claude/memory/company-knowledge.json)

---

**Document Owner**: Architect Agent
**Last Review**: 2026-01-27
**Next Review**: After MVP completion
