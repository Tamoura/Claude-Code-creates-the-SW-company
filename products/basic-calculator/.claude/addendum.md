# Basic Calculator - Agent Addendum

## Product Overview

**Name**: Basic Calculator
**Type**: Web app (client-side only)
**Status**: Inception

**Description**: A simple, fast, and accessible web-based calculator for basic arithmetic operations. No authentication, no database, pure client-side execution.

**Key Characteristics**:
- Client-side only (no backend/database)
- Single page application
- Keyboard and mouse/touch input
- Mobile-first responsive design
- Accessibility-focused (WCAG 2.1 AA)

## Tech Stack

**Completed by**: Architect Agent (2026-01-27)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Frontend** | React | 18.2+ | Component architecture, fast rendering |
| **Build Tool** | Vite | 5.x | Fast dev server, optimized production builds |
| **Language** | TypeScript | 5.x | Type safety for calculation logic |
| **Styling** | Tailwind CSS | 3.x | Utility-first, responsive design, small bundle |
| **Backend** | None | N/A | Client-side only - no server needed |
| **Database** | None | N/A | No data persistence in MVP |
| **Unit Testing** | Vitest | Latest | Fast, Vite-native, Jest-compatible API |
| **Component Testing** | React Testing Library | 14.x | Test user behavior, not implementation |
| **E2E Testing** | Playwright | 1.41+ | Cross-browser testing, mobile emulation |
| **Linting** | ESLint | 8.x | TypeScript rules, React hooks rules |
| **Formatting** | Prettier | 3.x | Consistent code style |
| **Deployment** | Vercel (recommended) | Latest | Auto-preview, free tier, CDN, HTTPS |

**Port**: 3101 (company standard: 3100+)

**See**: [ADR-001: Tech Stack Selection](../docs/ADRs/ADR-001-tech-stack.md) for rationale

## Libraries & Dependencies

**Completed by**: Architect Agent (2026-01-27)

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| `react` | UI framework | Component architecture, wide ecosystem, testable |
| `react-dom` | React DOM rendering | Official React renderer |
| `vite` | Build tool | Fast dev server, optimized builds, TypeScript support |
| `typescript` | Type safety | Prevents calculation errors, better IDE support |
| `tailwindcss` | CSS framework | Rapid development, small bundle (purged), responsive utilities |
| `vitest` | Unit testing | Vite-native, fast, Jest-compatible API |
| `@testing-library/react` | Component testing | Tests user behavior, encourages accessibility |
| `@playwright/test` | E2E testing | Cross-browser support, excellent mobile emulation |
| `eslint` | Linting | Catch errors, enforce code quality |
| `prettier` | Formatting | Consistent code style across team |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| `decimal.js`, `big.js` | Too heavy (6-32KB) for basic calculator - use custom rounding instead (see ADR-002) |
| `redux`, `zustand`, `jotai` | Unnecessary - simple useState is sufficient for single-component state |
| `next.js` | Overkill - no SSR needed, Vite is simpler and lighter |
| `styled-components`, `emotion` | Runtime overhead - Tailwind is faster and smaller |
| `jest` | Vitest is faster and Vite-native, use Vitest instead |
| `enzyme` | Outdated - React Testing Library is modern standard |
| Web fonts (Google Fonts, etc.) | Use system fonts for performance (no network request) |

**Bundle Size Budget**: < 100KB total (gzipped HTML + CSS + JS)

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | Calculator interface - main calculator with display, number pad, and operation buttons |

**Notes**:
- Single page application - only one route
- No navigation needed
- No separate pages (About, Help, etc.) in MVP
- Future: May add /help or /about if needed

## Design Patterns

**Completed by**: Architect Agent (2026-01-27)

### Component Patterns

**1. Separation of Concerns (PATTERN-006 from company knowledge)**

```
src/
├── components/          # UI components (React)
│   ├── Calculator.tsx   # Smart component (state + logic)
│   ├── Display.tsx      # Presentational (just displays)
│   ├── ButtonGrid.tsx   # Presentational (layout)
│   └── Button.tsx       # Reusable button
│
├── calculators/         # Pure functions (business logic)
│   ├── arithmetic.ts    # calculate() function
│   └── precision.ts     # rounding, formatting
│
├── types/
│   └── calculator.ts    # TypeScript interfaces
│
└── hooks/
    └── useCalculator.ts # Custom hook (optional)
```

**Why**: Separating calculation logic from UI makes testing easier and logic reusable.

**2. Smart vs Presentational Components**

- **Smart Component** (`Calculator.tsx`): Manages state, handles events, contains business logic
- **Presentational Components** (`Display.tsx`, `Button.tsx`): Receive props, render UI, no state

**Why**: Easier to test, reuse, and maintain.

**3. Pure Functions for Calculations**

```typescript
// ✅ GOOD: Pure function (testable without React)
export function calculate(a: number, b: number, op: Operation): number {
  // ...calculation logic
}

// ❌ BAD: Mixed with React component
function Calculator() {
  const handleClick = () => {
    const result = a + b; // Logic inside component
  }
}
```

**Why**: Pure functions are easier to test, debug, and reason about.

### State Management

**Strategy**: React `useState` only (no Redux/Zustand)

```typescript
// All state lives in Calculator.tsx
interface CalculatorState {
  currentValue: string;        // "42.5"
  previousValue: string | null; // "10"
  operation: '+' | '-' | '*' | '/' | null;
  shouldResetDisplay: boolean;
}

const [state, setState] = useState<CalculatorState>({ ... });
```

**Why No Global State**:
- Single component owns all state
- No prop drilling (only 2-3 component levels)
- Zero extra dependencies
- Follows company ANTI-002 pattern (avoid global state for simple apps)

**State Updates**: Always use functional updates for correctness

```typescript
// ✅ GOOD
setState(prev => ({ ...prev, currentValue: '5' }));

// ❌ BAD (can cause race conditions)
setState({ ...state, currentValue: '5' });
```

### API Patterns

**N/A** - No backend API, client-side only

**Future**: If we add backend (user accounts, calculation history):
- Use tRPC (company standard for TypeScript monorepos)
- RESTful API with Fastify
- See [Reusable Components Guide](/.claude/architecture/reusable-components.md)

## Business Logic

### Key Calculations/Algorithms

**1. Basic Arithmetic Operations**
- Addition: `a + b`
- Subtraction: `a - b`
- Multiplication: `a * b`
- Division: `a / b`

**2. Precision Requirements**
- Support decimal numbers up to 10 decimal places
- Handle floating point precision issues (avoid JavaScript floating point errors)
- Example issue to avoid: `0.1 + 0.2 = 0.30000000000000004` (should show `0.3`)

**3. Operation Chaining**
- Support continuous calculations: `5 + 3 - 2 = 6`
- When user presses operator after a result, use that result as first operand
- Example: `5 + 3 = 8`, then `+ 2` should compute `8 + 2 = 10`

**4. Order of Operations**
- MVP: Execute operations in sequence (calculator mode, not math mode)
- Example: `5 + 3 * 2 =` should compute `(5 + 3) * 2 = 16`, not `5 + (3 * 2) = 11`
- Note: This matches standard calculator behavior, not mathematical precedence

### Validation Rules

**1. Numeric Input**
- Accept digits 0-9
- Accept one decimal point per number
- Reject multiple decimal points in same number
- Reject invalid characters

**2. Division by Zero**
- Detect division by zero before calculation
- Display error message: "Error: Cannot divide by zero"
- Clear error on next number input or clear button

**3. Number Range**
- Maximum number: No explicit limit (let JavaScript handle)
- Display overflow: If number too large for display, use scientific notation or truncate with ellipsis
- Minimum absolute value: Support very small decimals (0.0000000001)

**4. Display Formatting**
- Integers: Display as-is (e.g., `42`)
- Decimals: Display up to 10 decimal places, trim trailing zeros (e.g., `3.14`, not `3.1400000000`)
- Very long decimals: Round to 10 places (e.g., `1/3 = 0.3333333333`)
- Large numbers: If over 12 digits, consider scientific notation

### Input State Machine

```
READY → (number input) → ENTERING_FIRST_NUMBER
ENTERING_FIRST_NUMBER → (operator) → OPERATOR_SELECTED
OPERATOR_SELECTED → (number input) → ENTERING_SECOND_NUMBER
ENTERING_SECOND_NUMBER → (equals) → RESULT_DISPLAYED
RESULT_DISPLAYED → (operator) → OPERATOR_SELECTED (use result as first number)
RESULT_DISPLAYED → (number) → ENTERING_FIRST_NUMBER (start new calculation)
ANY_STATE → (clear) → READY
ERROR → (number input or clear) → READY
```

## Data Models

**Completed by**: Architect Agent (2026-01-27)

### Key Entities

**1. Calculator State** (runtime only, no persistence)

```typescript
// src/types/calculator.ts

interface CalculatorState {
  currentValue: string;        // Current display value (what user is typing or result)
  previousValue: string | null; // Previous operand (stored when operation selected)
  operation: '+' | '-' | '*' | '/' | null; // Selected operation
  shouldResetDisplay: boolean;  // Flag to reset display on next number input
}
```

**Example State Transitions**:
```
Initial:   { currentValue: "0", previousValue: null, operation: null, shouldResetDisplay: false }
Press "5": { currentValue: "5", previousValue: null, operation: null, shouldResetDisplay: false }
Press "+": { currentValue: "5", previousValue: "5", operation: "+", shouldResetDisplay: true }
Press "3": { currentValue: "3", previousValue: "5", operation: "+", shouldResetDisplay: false }
Press "=": { currentValue: "8", previousValue: null, operation: null, shouldResetDisplay: false }
```

**2. Operation Type**

```typescript
type Operation = '+' | '-' | '*' | '/';
```

**3. Button Type**

```typescript
type ButtonVariant = 'number' | 'operator' | 'equals' | 'clear';

interface ButtonProps {
  value: string;
  onClick: () => void;
  ariaLabel: string;
  variant: ButtonVariant;
}
```

### No Database Models

**Rationale**: Client-side only app, no data persistence in MVP.

**Future (Phase 2)**: If we add calculation history:
```typescript
// localStorage only (no database)
interface CalculationHistory {
  id: string;
  timestamp: Date;
  expression: string;  // "5 + 3"
  result: string;      // "8"
}
```

## External Integrations

None - This is a standalone client-side application.

## Performance Requirements

**Completed by**: Architect Agent (2026-01-27)

### Performance Metrics

| Metric | Target | How to Measure | Notes |
|--------|--------|----------------|-------|
| **Initial page load** | < 1 second on 3G | Lighthouse Performance score > 90 | Test with throttled connection |
| **Bundle size** | < 100KB (gzipped) | Vite build output, Bundle Analyzer | React ~45KB, our code ~20KB, Tailwind ~10KB |
| **Calculation execution** | < 100ms | Unit test timing | Actually < 1ms (native JavaScript arithmetic) |
| **Button feedback** | < 50ms | Visual inspection, Lighthouse | CSS transitions, no blocking JS |
| **Time to Interactive (TTI)** | < 2 seconds | Lighthouse | Static HTML, minimal JS execution |
| **First Contentful Paint (FCP)** | < 1 second | Lighthouse | Critical CSS inlined |

### Bundle Size Breakdown

```
Total Budget: 100KB (gzipped)
├── HTML: ~5KB
├── CSS: ~10KB (Tailwind purged)
└── JavaScript: ~70KB
    ├── React + ReactDOM: ~45KB
    ├── App code: ~15KB
    └── Vite runtime: ~10KB

Actual size: ~90KB (10KB buffer)
```

### Optimization Techniques

**Build-time**:
- Vite tree-shaking (removes unused code)
- Terser minification (compress variable names)
- Tailwind CSS purging (removes unused classes)
- No polyfills needed (modern browsers only)

**Runtime**:
- No external API calls (zero network latency)
- System fonts (no web font loading)
- CSS-only design (no images)
- Inline critical CSS (no render-blocking)
- Calculations are synchronous (no async overhead)

**Not Needed**:
- Code splitting (bundle already tiny)
- Lazy loading (everything needed upfront)
- Service worker (Phase 2 PWA feature)

### Testing Performance

```bash
# Lighthouse CI (run on every PR)
npm run build
npx lighthouse http://localhost:4173 --view

# Bundle size check
npm run build
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Manual 3G test
# Chrome DevTools > Network > Throttling > Slow 3G
```

## Special Considerations

### 1. Floating Point Precision
**Problem**: JavaScript has floating point precision issues
```javascript
0.1 + 0.2 = 0.30000000000000004 // Not 0.3!
```

**Solution**: Consider using a decimal arithmetic library (e.g., decimal.js, big.js) OR implement custom rounding for display purposes.

**Recommendation**: Architect to decide on approach based on trade-offs (bundle size vs. accuracy).

### 2. Accessibility First
- All buttons must have proper ARIA labels
- Keyboard navigation must work perfectly (Tab, Arrow keys, Enter, Escape)
- Screen reader must announce all actions (button presses, results, errors)
- Focus states must be clearly visible
- Touch targets must be 44x44px minimum on mobile

### 3. Mobile Considerations
- Large, easy-to-tap buttons (60x60px minimum on mobile)
- Prevent double-tap zoom on buttons
- Prevent text selection on button taps
- Handle both portrait and landscape orientations
- Consider thumb reachability zones

### 4. No Data Persistence
- No localStorage/sessionStorage usage in MVP
- Each page refresh starts fresh
- No cookies
- Phase 2 may add optional history with localStorage

### 5. Error Recovery
- Any error state should be recoverable
- User should never get "stuck" in error state
- Pressing any number or clear should recover from errors
- Clear (C) clears current input, All Clear (AC) resets everything

### 6. Keyboard Shortcuts
Essential keyboard support:
- `0-9`: Number input
- `+`, `-`, `*`, `/`: Operators
- `Enter` or `=`: Calculate result
- `Escape` or `C`: Clear
- `.`: Decimal point
- `Backspace`: Delete last digit (optional, Phase 2)

### 7. No External Dependencies for Core Logic
- Calculator logic should be pure JavaScript/TypeScript
- No reliance on external APIs or services
- Works offline after initial load
- Future: Could become PWA for full offline support

### 8. Browser Compatibility
- Use standard Web APIs only (no experimental features)
- Polyfills if needed for older browser support
- Test on actual devices, not just emulators
- Target browsers:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

### 9. Testing Strategy
- **Unit Tests**: All calculation logic (aim for 100% coverage)
- **Integration Tests**: User workflows (button clicks → results)
- **E2E Tests**: Full user scenarios on real browsers
- **Accessibility Tests**: Automated accessibility checks
- **Manual Testing**: Real device testing for touch/mobile

---

## Architecture References

**For detailed technical architecture, see**:
- [System Architecture Document](../docs/architecture.md)
- [ADR-001: Tech Stack Selection](../docs/ADRs/ADR-001-tech-stack.md)
- [ADR-002: Decimal Precision Strategy](../docs/ADRs/ADR-002-decimal-precision.md)
- [ADR-003: Accessibility-First Design](../docs/ADRs/ADR-003-accessibility-first.md)

---

*Created by*: Product Manager (2026-01-27)
*Tech Stack by*: Architect Agent (2026-01-27)
*Last Updated*: 2026-01-27
*Status*: Ready for Frontend Engineer
