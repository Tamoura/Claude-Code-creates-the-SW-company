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

*To be completed by Architect*

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | TBD | |
| Backend | None | Client-side only |
| Database | None | No data persistence |
| Styling | TBD | |
| Testing | TBD | |
| Deployment | TBD | |

## Libraries & Dependencies

*To be completed by Architect*

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| TBD | TBD | TBD |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| TBD | TBD |

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

*To be completed by Architect*

### Component Patterns
TBD

### State Management
TBD

### API Patterns
N/A - No backend API

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

*To be completed by Architect*

### Key Entities
TBD

**Calculator State** (example):
- currentValue: string | number
- previousValue: string | number | null
- operation: '+' | '-' | '*' | '/' | null
- displayValue: string
- isError: boolean
- errorMessage: string | null

## External Integrations

None - This is a standalone client-side application.

## Performance Requirements

- **Initial page load**: < 1 second on 3G connection
  - Minimal bundle size (target < 100KB gzipped)
  - No external API calls
  - Inline critical CSS

- **Calculation execution**: < 100ms
  - All calculations are synchronous
  - No heavy computations

- **Button press feedback**: < 50ms
  - Immediate visual feedback on click/tap
  - Smooth animations (60fps)

- **Bundle size targets**:
  - HTML: < 5KB
  - CSS: < 10KB
  - JavaScript: < 50KB (gzipped)
  - Total: < 100KB (initial load)

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

*Created by*: Product Manager
*Last Updated*: 2026-01-27
*Next: Architect to complete Tech Stack, Libraries, Design Patterns, and Data Models sections*
